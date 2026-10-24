package classroom

import (
	"context"
	"errors"
	"path/filepath"
	"testing"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestPersistedFollowupUniqueLinkAndFrozenPreview(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "paired.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err = db.AutoMigrate(&models.Classroom{}, &models.ClassroomQuiz{}, &models.ClassroomQuizSubmission{}); err != nil {
		t.Fatal(err)
	}
	if err = db.Create(&models.Classroom{PublicID: "class", TeacherID: 1, Name: "Class"}).Error; err != nil {
		t.Fatal(err)
	}
	r := NewRepo(db)
	ctx := context.Background()
	base := domain.Quiz{PublicID: "pre", ClassroomID: 1, TeacherID: 1, Title: "pre", Phase: domain.QuizPhasePreClass, Status: domain.QuizStatusOpen, Questions: []domain.QuizQuestion{{ID: "q", Options: []string{"a", "b"}, Answer: 0}}}
	if _, err = r.CreateQuiz(ctx, base); err != nil {
		t.Fatal(err)
	}
	post := base
	post.PublicID = "post"
	post.SourceQuizID = "pre"
	post.Phase = domain.QuizPhaseInClass
	post.Status = domain.QuizStatusDraft
	if _, err = r.CreateQuiz(ctx, post); !errors.Is(err, repository.ErrInvalidInput) {
		t.Fatalf("linked open preview: %v", err)
	}
	if err = r.UpdateQuizStatus(ctx, "pre", 1, domain.QuizStatusClosed); err != nil {
		t.Fatal(err)
	}
	saved, err := r.CreateQuiz(ctx, post)
	if err != nil || saved.SourceQuizID != "pre" {
		t.Fatalf("link not persisted: %+v %v", saved, err)
	}
	post.PublicID = "post-again"
	if _, err = r.CreateQuiz(ctx, post); !errors.Is(err, repository.ErrDuplicate) && !errors.Is(err, repository.ErrConflict) {
		t.Fatalf("duplicate link: %v", err)
	}
	if err = r.UpdateQuizStatus(ctx, "pre", 1, domain.QuizStatusOpen); !errors.Is(err, repository.ErrInvalidInput) {
		t.Fatalf("reopened linked preview: %v", err)
	}
	if err = r.UpdateQuizStatus(ctx, "post", 1, domain.QuizStatusOpen); err != nil {
		t.Fatal(err)
	}
	// Two unrelated previews must both allow a NULL source under the unique index.
	base.PublicID = "pre-two"
	if _, err = r.CreateQuiz(ctx, base); err != nil {
		t.Fatalf("nullable source uniqueness: %v", err)
	}
}
