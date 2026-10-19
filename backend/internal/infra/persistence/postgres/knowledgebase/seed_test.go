package knowledgebase

import (
	"errors"
	"testing"

	domainknowledgebase "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/knowledgebase"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newBuiltinSeedTestRepo(t *testing.T) (*Repo, *gorm.DB) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err = db.AutoMigrate(&models.KnowledgeBase{}, &models.KnowledgeBaseFile{}, &models.FileObject{}, &models.BuiltinKnowledgeBaseSeed{}); err != nil {
		t.Fatal(err)
	}
	files := []models.FileObject{
		{FileID: "note-v1", UserID: 0, FileName: "ss-2-5.md", Status: "active"},
		{FileID: "note-v2", UserID: 0, FileName: "ss-2-5.md", Status: "active"},
		{FileID: "extra", UserID: 0, FileName: "teacher.md", Status: "active"},
		{FileID: "private", UserID: 7, FileName: "private.md", Status: "active"},
	}
	if err = db.Create(&files).Error; err != nil {
		t.Fatal(err)
	}
	return NewRepo(db), db
}

func builtinSeedTestInput(version, fileID string) repository.BuiltinKnowledgeBaseInput {
	return repository.BuiltinKnowledgeBaseInput{
		BuiltinKnowledgeBaseSeed: repository.BuiltinKnowledgeBaseSeed{
			Key: "signals-systems", Version: version, PublicID: "kb_signals_systems", FileIDs: []string{fileID},
		},
		Name: "信号与系统", Description: "Bundled notes",
	}
}

func TestBuiltinSeedIdempotenceAndUpgradePreserveAdminChanges(t *testing.T) {
	repo, db := newBuiltinSeedTestRepo(t)
	input := builtinSeedTestInput("v1", "note-v1")
	if err := repo.ApplyBuiltinKnowledgeBase(t.Context(), input); err != nil {
		t.Fatal(err)
	}
	base, err := repo.GetKnowledgeBaseByPublicID(t.Context(), input.PublicID)
	if err != nil {
		t.Fatal(err)
	}
	if base.Scope != domainknowledgebase.ScopeBuiltin || base.OwnerUserID != 0 || base.FileCount != 1 {
		t.Fatalf("unexpected seeded library: %#v", base)
	}
	if err = repo.ApplyBuiltinKnowledgeBase(t.Context(), input); err != nil {
		t.Fatal(err)
	}
	again, err := repo.GetKnowledgeBaseByPublicID(t.Context(), input.PublicID)
	if err != nil || again.Revision != base.Revision {
		t.Fatal("unchanged package changed the library revision")
	}
	if err = repo.AddKnowledgeBaseFiles(t.Context(), base.ID, domainknowledgebase.ScopeBuiltin, 0, 99, []string{"extra"}); err != nil {
		t.Fatal(err)
	}
	if err = db.Model(&models.KnowledgeBase{}).Where("id = ?", base.ID).
		Updates(map[string]any{"enabled": false, "name": "老师修改的名称"}).Error; err != nil {
		t.Fatal(err)
	}
	if err = repo.ApplyBuiltinKnowledgeBase(t.Context(), builtinSeedTestInput("v2", "note-v2")); err != nil {
		t.Fatal(err)
	}
	updated, err := repo.GetKnowledgeBaseByPublicID(t.Context(), input.PublicID)
	if err != nil || updated.Enabled || updated.Name != "老师修改的名称" || updated.FileCount != 2 {
		t.Fatalf("upgrade overwrote administrator settings: %#v, %v", updated, err)
	}
	if _, err = repo.GetKnowledgeBaseFile(t.Context(), base.ID, "note-v1"); !errors.Is(err, repository.ErrNotFound) {
		t.Fatal("old content still linked after upgrade")
	}
	for _, id := range []string{"note-v2", "extra"} {
		if _, err = repo.GetKnowledgeBaseFile(t.Context(), base.ID, id); err != nil {
			t.Fatal(err)
		}
	}
	state, err := repo.GetBuiltinKnowledgeBaseSeed(t.Context(), input.Key)
	if err != nil || state.Version != "v2" {
		t.Fatalf("completion marker: %#v, %v", state, err)
	}
}

func TestBuiltinSeedRejectsPrivateFilesWithoutSwitchingContent(t *testing.T) {
	repo, _ := newBuiltinSeedTestRepo(t)
	if err := repo.ApplyBuiltinKnowledgeBase(t.Context(), builtinSeedTestInput("v1", "note-v1")); err != nil {
		t.Fatal(err)
	}
	if err := repo.ApplyBuiltinKnowledgeBase(t.Context(), builtinSeedTestInput("v2", "private")); !errors.Is(err, repository.ErrNotFound) {
		t.Fatalf("private file accepted: %v", err)
	}
	state, err := repo.GetBuiltinKnowledgeBaseSeed(t.Context(), "signals-systems")
	if err != nil || state.Version != "v1" {
		t.Fatal("failed upgrade changed the completion marker")
	}
	base, err := repo.GetKnowledgeBaseByPublicID(t.Context(), state.PublicID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = repo.GetKnowledgeBaseFile(t.Context(), base.ID, "note-v1"); err != nil {
		t.Fatal("failed upgrade removed the previous notes")
	}
}

func TestBuiltinSeedPreservesDeletionAndDoesNotAdoptManualLibrary(t *testing.T) {
	repo, db := newBuiltinSeedTestRepo(t)
	manual := models.KnowledgeBase{PublicID: "manual", Name: "信号与系统", Scope: domainknowledgebase.ScopeBuiltin, Enabled: true}
	if err := db.Create(&manual).Error; err != nil {
		t.Fatal(err)
	}
	input := builtinSeedTestInput("v1", "note-v1")
	if err := repo.ApplyBuiltinKnowledgeBase(t.Context(), input); err != nil {
		t.Fatal(err)
	}
	base, err := repo.GetKnowledgeBaseByPublicID(t.Context(), input.PublicID)
	if err != nil || base.Name != "信号与系统（CourseMate 内置）" {
		t.Fatalf("did not preserve manual library: %#v, %v", base, err)
	}
	if _, err = repo.DeleteKnowledgeBase(t.Context(), base.ID); err != nil {
		t.Fatal(err)
	}
	if err = repo.ApplyBuiltinKnowledgeBase(t.Context(), builtinSeedTestInput("v2", "note-v2")); err != nil {
		t.Fatal(err)
	}
	if exists, err := repo.BuiltinKnowledgeBaseExists(t.Context(), input.PublicID); err != nil || exists {
		t.Fatal("upgrade recreated a deleted library")
	}
}
