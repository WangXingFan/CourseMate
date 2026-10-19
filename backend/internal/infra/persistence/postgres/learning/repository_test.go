package learning

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestReviewPersistenceRetryAndLegacy(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "learning.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.AutoMigrate(&models.LearningAttempt{}); err != nil {
		t.Fatal(err)
	}
	r := NewRepo(db)
	ctx := context.Background()
	now := time.Date(2026, 10, 19, 0, 0, 0, 0, time.UTC)
	legacy := models.LearningAttempt{UserID: 1, AttemptID: uuid.NewString(), QuestionID: "energy-signal", Selected: 1, CreatedAt: now}
	if err := db.Create(&legacy).Error; err != nil {
		t.Fatal(err)
	}
	p, err := r.Progress(ctx, 1)
	if err != nil || len(p.Questions) != 1 || p.Questions[0].NextReviewAt == nil || !p.Questions[0].NextReviewAt.Equal(now.Add(24*time.Hour)) {
		t.Fatalf("legacy: %+v %v", p, err)
	}
	input := domain.Attempt{ID: uuid.NewString(), UserID: 1, QuestionID: "energy-signal", Mode: "review", VariantID: "energy-signal-v1", Correct: true}
	for stage, days := range []int{3, 7, 14, 30, 0} {
		input.ID = uuid.NewString()
		first, err := r.SaveReview(ctx, input, now)
		if err != nil || first == nil || first.ReviewStage != stage+1 {
			t.Fatalf("stage: %+v %v", first, err)
		}
		if days > 0 && (first.NextReviewAt == nil || !first.NextReviewAt.Equal(now.Add(time.Duration(days)*24*time.Hour))) {
			t.Fatal("wrong due date")
		}
		retry, err := r.SaveReview(ctx, input, now.Add(100*time.Hour))
		if err != nil || retry.ReviewStage != first.ReviewStage || !retry.CreatedAt.Equal(first.CreatedAt) {
			t.Fatal("retry advanced state")
		}
	}
	if _, err := r.SaveAttempt(ctx, domain.Attempt{ID: uuid.NewString(), UserID: 1, QuestionID: "energy-signal", Correct: true}); err != nil {
		t.Fatal(err)
	}
	p, err = r.Progress(ctx, 1)
	if err != nil || p.Questions[0].LatestWrong == nil || p.Questions[0].ReviewStage != 5 || p.Questions[0].NextReviewAt != nil {
		t.Fatal("correct quiz erased review or mistake")
	}
	other, err := r.Progress(ctx, 2)
	if err != nil || len(other.Questions) != 0 {
		t.Fatal("account leak")
	}
	input.ID = uuid.NewString()
	input.Correct = false
	reset, err := r.SaveReview(ctx, input, now)
	if err != nil || reset.ReviewStage != 0 || reset.NextReviewAt == nil || !reset.NextReviewAt.Equal(now.Add(24*time.Hour)) {
		t.Fatal("wrong answer did not reset")
	}
}
