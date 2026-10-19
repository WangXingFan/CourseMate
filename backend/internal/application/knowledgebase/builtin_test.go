package knowledgebase

import (
	"context"
	"errors"
	"testing"

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
	if len(importer.names) != 75 || len(repo.state.FileIDs) != 75 {
		t.Fatalf("imported %d notes and linked %d files", len(importer.names), len(repo.state.FileIDs))
	}
	if err := seeder.Seed(t.Context(), pack); err != nil {
		t.Fatal(err)
	}
	if len(importer.names) != 75 || repo.applies != 1 {
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
