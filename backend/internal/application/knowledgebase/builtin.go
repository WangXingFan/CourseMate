package knowledgebase

import (
	"context"
	"errors"
	"fmt"

	appupload "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/upload"
	domainknowledgebase "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/knowledgebase"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
)

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
