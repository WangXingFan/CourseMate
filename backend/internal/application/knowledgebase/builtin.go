package knowledgebase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	appembedding "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/embedding"
	appupload "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/upload"
	domainknowledgebase "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/knowledgebase"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
)

// Run retries notes that were still being parsed at startup, or whose embedding
// configuration became available later. Submission is idempotent for queued and
// completed files. The application owns this worker's cancellation context.
func (b *BuiltinEmbeddingBackfiller) Run(ctx context.Context, onError func(error)) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			runCtx, cancel := context.WithTimeout(ctx, 25*time.Second)
			err := b.Backfill(runCtx)
			cancel()
			if err != nil && !errors.Is(err, appembedding.ErrEmbeddingServiceNotConfigured) && onError != nil {
				onError(err)
			}
		}
	}
}

type builtinMarkdownImporter interface {
	ImportBuiltinMarkdown(ctx context.Context, fileName string, markdown string) (*appupload.UploadFileResult, error)
}

// BuiltinSeeder imports bundled notes using the ordinary storage/processing
// pipeline. It requires neither a signed-in account nor an embedding provider.
type BuiltinSeeder struct {
	repo     repository.BuiltinKnowledgeBaseRepository
	importer builtinMarkdownImporter
}

func NewBuiltinSeeder(repo repository.BuiltinKnowledgeBaseRepository, importer builtinMarkdownImporter) *BuiltinSeeder {
	return &BuiltinSeeder{repo: repo, importer: importer}
}

func (s *BuiltinSeeder) Seed(ctx context.Context, pack domainknowledgebase.BuiltinPackage) error {
	version := pack.Version + ":" + pack.Digest
	previous, err := s.repo.GetBuiltinKnowledgeBaseSeed(ctx, pack.Key)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return err
	}
	if previous != nil {
		if previous.Version == version {
			return nil
		}
		exists, lookupErr := s.repo.BuiltinKnowledgeBaseExists(ctx, previous.PublicID)
		if lookupErr != nil || !exists {
			return lookupErr
		}
	}
	fileIDs := make([]string, 0, len(pack.Documents))
	for _, document := range pack.Documents {
		result, importErr := s.importer.ImportBuiltinMarkdown(ctx, document.ID+".md", document.Markdown)
		if importErr != nil {
			return fmt.Errorf("import builtin note %s: %w", document.ID, importErr)
		}
		fileIDs = append(fileIDs, result.File.FileID)
	}
	return s.repo.ApplyBuiltinKnowledgeBase(ctx, repository.BuiltinKnowledgeBaseInput{
		BuiltinKnowledgeBaseSeed: repository.BuiltinKnowledgeBaseSeed{
			Key: pack.Key, Version: version, PublicID: pack.PublicID, FileIDs: fileIDs,
		},
		Name: pack.Name, Description: pack.Description,
	})
}

type builtinEmbeddingSubmitter interface {
	SubmitFileEmbeddings(ctx context.Context, userID uint, fileIDs []string) (appembedding.TargetedSubmissionResult, error)
}

// BuiltinEmbeddingBackfiller re-queues platform-owned notes that predate a
// working embedding configuration. It never touches personal files.
type BuiltinEmbeddingBackfiller struct {
	repo      repository.BuiltinKnowledgeBaseRepository
	submitter builtinEmbeddingSubmitter
	key       string
}

func NewBuiltinEmbeddingBackfiller(
	repo repository.BuiltinKnowledgeBaseRepository,
	submitter builtinEmbeddingSubmitter,
	key string,
) *BuiltinEmbeddingBackfiller {
	return &BuiltinEmbeddingBackfiller{
		repo:      repo,
		submitter: submitter,
		key:       strings.TrimSpace(key),
	}
}

// Backfill submits the exact files recorded for an existing bundled library.
// A retained seed record for a deleted library intentionally remains a no-op.
func (b *BuiltinEmbeddingBackfiller) Backfill(ctx context.Context) error {
	if b == nil || b.repo == nil || strings.TrimSpace(b.key) == "" {
		return nil
	}
	seed, err := b.repo.GetBuiltinKnowledgeBaseSeed(ctx, b.key)
	if errors.Is(err, repository.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	if seed == nil || strings.TrimSpace(seed.PublicID) == "" || len(seed.FileIDs) == 0 {
		return nil
	}
	exists, err := b.repo.BuiltinKnowledgeBaseExists(ctx, seed.PublicID)
	if err != nil {
		return err
	}
	if !exists {
		return nil
	}
	if b.submitter == nil {
		return errors.New("builtin embedding submitter is not configured")
	}
	_, err = b.submitter.SubmitFileEmbeddings(ctx, 0, seed.FileIDs)
	return err
}
