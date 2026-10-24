package knowledgebase

import (
	"context"
	"errors"
	"testing"

	appembedding "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/embedding"
	appupload "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/upload"
	domainconversation "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/conversation"
	domainknowledgebase "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/knowledgebase"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
)

func TestBuiltinSeederImportsAllNotesOnce(t *testing.T) {
	repo := &builtinSeedRepoStub{exists: true}
	importer := &builtinImporterStub{}
	seeder := NewBuiltinSeeder(repo, importer)
	pack := domainknowledgebase.SignalsPackage()
	if err := seeder.Seed(t.Context(), pack); err != nil {
		t.Fatal(err)
	}
	if len(importer.names) != 52 || len(repo.state.FileIDs) != 52 {
		t.Fatalf("imported %d notes and linked %d files", len(importer.names), len(repo.state.FileIDs))
	}
	if err := seeder.Seed(t.Context(), pack); err != nil {
		t.Fatal(err)
	}
	if len(importer.names) != 52 || repo.applies != 1 {
		t.Fatal("restart repeated a completed import")
	}
}

func TestBuiltinSeederResumesInterruptedImportAndRespectsDeletion(t *testing.T) {
	repo := &builtinSeedRepoStub{exists: true}
	importer := &builtinImporterStub{failAt: 3}
	seeder := NewBuiltinSeeder(repo, importer)
	pack := domainknowledgebase.SignalsPackage()
	if err := seeder.Seed(t.Context(), pack); err == nil || repo.applies != 0 {
		t.Fatal("incomplete import was marked complete")
	}
	importer.failAt = 0
	if err := seeder.Seed(t.Context(), pack); err != nil {
		t.Fatal(err)
	}
	before := len(importer.names)
	pack.Version += ".next"
	repo.exists = false
	if err := seeder.Seed(t.Context(), pack); err != nil {
		t.Fatal(err)
	}
	if len(importer.names) != before || repo.applies != 1 {
		t.Fatal("upgrade attempted to recreate a deleted library")
	}
}

func TestBuiltinEmbeddingBackfillerSubmitsSeededFilesAsPlatformOwned(t *testing.T) {
	repo := &builtinSeedRepoStub{
		exists: true,
		state: &repository.BuiltinKnowledgeBaseSeed{
			Key:      "signals",
			PublicID: "signals-kb",
			FileIDs:  []string{"file_1", "file_2"},
		},
	}
	submitter := &builtinEmbeddingSubmitterStub{}
	backfiller := NewBuiltinEmbeddingBackfiller(repo, submitter, "signals")

	if err := backfiller.Backfill(t.Context()); err != nil {
		t.Fatal(err)
	}
	if len(submitter.calls) != 1 {
		t.Fatalf("submission calls = %d, want 1", len(submitter.calls))
	}
	call := submitter.calls[0]
	if call.userID != 0 {
		t.Fatalf("submitted userID = %d, want platform owner 0", call.userID)
	}
	if len(call.fileIDs) != 2 || call.fileIDs[0] != "file_1" || call.fileIDs[1] != "file_2" {
		t.Fatalf("submitted file IDs = %#v", call.fileIDs)
	}
}

func TestBuiltinEmbeddingBackfillerSkipsMissingOrDeletedLibrary(t *testing.T) {
	tests := []struct {
		name string
		repo *builtinSeedRepoStub
	}{
		{name: "missing seed", repo: &builtinSeedRepoStub{exists: true}},
		{
			name: "deleted library",
			repo: &builtinSeedRepoStub{
				exists: false,
				state:  &repository.BuiltinKnowledgeBaseSeed{PublicID: "signals-kb", FileIDs: []string{"file_1"}},
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			submitter := &builtinEmbeddingSubmitterStub{}
			backfiller := NewBuiltinEmbeddingBackfiller(test.repo, submitter, "signals")
			if err := backfiller.Backfill(t.Context()); err != nil {
				t.Fatal(err)
			}
			if len(submitter.calls) != 0 {
				t.Fatalf("unexpected submission: %#v", submitter.calls)
			}
		})
	}
}

type builtinEmbeddingSubmission struct {
	userID  uint
	fileIDs []string
}

type builtinEmbeddingSubmitterStub struct {
	calls []builtinEmbeddingSubmission
	err   error
}

func (s *builtinEmbeddingSubmitterStub) SubmitFileEmbeddings(_ context.Context, userID uint, fileIDs []string) (appembedding.TargetedSubmissionResult, error) {
	s.calls = append(s.calls, builtinEmbeddingSubmission{
		userID:  userID,
		fileIDs: append([]string(nil), fileIDs...),
	})
	return appembedding.TargetedSubmissionResult{}, s.err
}

type builtinSeedRepoStub struct {
	state   *repository.BuiltinKnowledgeBaseSeed
	exists  bool
	applies int
}

func (r *builtinSeedRepoStub) GetBuiltinKnowledgeBaseSeed(context.Context, string) (*repository.BuiltinKnowledgeBaseSeed, error) {
	if r.state == nil {
		return nil, repository.ErrNotFound
	}
	return r.state, nil
}

func (r *builtinSeedRepoStub) BuiltinKnowledgeBaseExists(context.Context, string) (bool, error) {
	return r.exists, nil
}

func (r *builtinSeedRepoStub) ApplyBuiltinKnowledgeBase(_ context.Context, input repository.BuiltinKnowledgeBaseInput) error {
	r.applies++
	r.state = &input.BuiltinKnowledgeBaseSeed
	return nil
}

type builtinImporterStub struct {
	names  []string
	failAt int
}

func (i *builtinImporterStub) ImportBuiltinMarkdown(_ context.Context, name string, _ string) (*appupload.UploadFileResult, error) {
	i.names = append(i.names, name)
	if i.failAt == len(i.names) {
		return nil, errors.New("storage unavailable")
	}
	return &appupload.UploadFileResult{File: domainconversation.FileObject{FileID: name}}, nil
}
