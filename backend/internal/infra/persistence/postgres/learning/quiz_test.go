package learning

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/learning"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func quizTestRepo(t *testing.T) *Repo {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "quiz.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err = db.AutoMigrate(&models.User{}, &models.LearningQuizRound{}, &models.LearningAttempt{}); err != nil {
		t.Fatal(err)
	}
	return NewRepo(db)
}

func TestChapterQuizLifecycleAndRetry(t *testing.T) {
	r := quizTestRepo(t)
	ctx := context.Background()
	now := time.Date(2026, 10, 24, 0, 0, 0, 0, time.UTC)
	input := domain.QuizRound{ID: uuid.NewString(), UserID: 1, ChapterID: "2", QuestionIDs: []string{"step-response", "time-constant"}, Answers: []domain.QuizAnswer{}, StartedAt: now, DeadlineAt: now.Add(domain.QuizDuration)}
	round, err := r.StartQuizRound(ctx, input)
	if err != nil {
		t.Fatal(err)
	}
	first, err := r.AnswerQuizRound(ctx, 1, round.ID, "step-response", 1, now.Add(2*time.Second))
	if err != nil || first.Score != 10 || len(first.Answers) != 1 {
		t.Fatalf("first: %+v %v", first, err)
	}
	retry, err := r.AnswerQuizRound(ctx, 1, round.ID, "step-response", 1, now.Add(3*time.Second))
	if err != nil || retry.Score != 10 || len(retry.Answers) != 1 {
		t.Fatalf("retry: %+v %v", retry, err)
	}
	if _, err = r.AnswerQuizRound(ctx, 1, round.ID, "step-response", 0, now); !errors.Is(err, repository.ErrConflict) {
		t.Fatalf("changed retry: %v", err)
	}
	if _, err = r.AnswerQuizRound(ctx, 2, round.ID, "time-constant", 0, now); !errors.Is(err, repository.ErrNotFound) {
		t.Fatalf("cross-account: %v", err)
	}
	if _, err = r.AnswerQuizRound(ctx, 1, round.ID, "energy-signal", 0, now); !errors.Is(err, repository.ErrInvalidInput) {
		t.Fatalf("cross-chapter: %v", err)
	}
	done, err := r.AnswerQuizRound(ctx, 1, round.ID, "time-constant", 0, now.Add(4250*time.Millisecond))
	if err != nil || done.Score != 22 || done.ElapsedMS != 4250 || done.FinishedAt == nil || done.BestStreak != 2 {
		t.Fatalf("done: %+v %v", done, err)
	}
	finished, err := r.FinishQuizRound(ctx, 1, round.ID, now.Add(time.Hour))
	if err != nil || finished.ElapsedMS != 4250 {
		t.Fatalf("finish retry: %+v %v", finished, err)
	}
	restored, err := r.StartQuizRound(ctx, input)
	if err != nil || restored.Score != 22 || restored.ElapsedMS != 4250 {
		t.Fatalf("start retry: %+v %v", restored, err)
	}
	var count int64
	r.db.Model(&models.LearningAttempt{}).Count(&count)
	if count != 2 {
		t.Fatalf("attempts=%d", count)
	}
	input.ID = uuid.NewString()
	input.QuestionIDs = []string{"step-response"}
	input.Answers = []domain.QuizAnswer{}
	round, err = r.StartQuizRound(ctx, input)
	if err != nil {
		t.Fatal(err)
	}
	expired, err := r.AnswerQuizRound(ctx, 1, round.ID, "step-response", 1, now.Add(91*time.Second))
	if err != nil || expired.Score != 0 || len(expired.Answers) != 0 || expired.ElapsedMS != 90000 || expired.FinishedAt == nil {
		t.Fatalf("timeout: %+v %v", expired, err)
	}
}

func TestQuizLeaderboardOrderingAndBestPerStudent(t *testing.T) {
	r := quizTestRepo(t)
	ctx := context.Background()
	now := time.Now().UTC()
	for i, role := range []string{"student", "student", "student", "teacher", "student", "student"} {
		u := models.User{Username: uuid.NewString(), PublicID: uuid.NewString(), DisplayName: role, Role: role, Status: "active"}
		if err := r.db.Create(&u).Error; err != nil {
			t.Fatal(err)
		}
		if int(u.ID) != i+1 {
			t.Fatal("unexpected id")
		}
	}
	seed := func(user uint, chapter string, score int, elapsed int64, answers int) {
		t.Helper()
		if err := r.db.Create(&models.LearningQuizRound{ID: uuid.NewString(), UserID: user, ChapterID: chapter, BankVersion: domain.QuizBankVersion(), Payload: "{}", Score: score, ElapsedMS: elapsed, AnswerCount: answers, FinishedAt: &now, StartedAt: now.Add(-time.Minute)}).Error; err != nil {
			t.Fatal(err)
		}
	}
	seed(1, "2", 22, 10000, 2)
	seed(1, "2", 22, 8000, 2)
	seed(1, "2", 10, 1000, 1)
	seed(2, "2", 22, 7000, 2)
	seed(3, "2", 34, 30000, 3)
	seed(4, "2", 99, 10, 4)
	seed(5, "3", 99, 10, 4)
	seed(6, "2", 0, 90000, 0)
	rows, err := r.QuizLeaderboard(ctx, 1, "2")
	if err != nil || len(rows) != 3 {
		t.Fatalf("rankings: %+v %v", rows, err)
	}
	if rows[0].Score != 34 || rows[1].ElapsedMS != 7000 || rows[2].ElapsedMS != 8000 || !rows[2].IsCurrentUser || rows[2].Rank != 3 {
		t.Fatalf("ordering: %+v", rows)
	}
	seed(6, "2", 0, 12000, 1)
	rows, err = r.QuizLeaderboard(ctx, 1, "2")
	if err != nil || len(rows) != 4 || rows[3].Score != 0 {
		t.Fatalf("zero score with answers should rank: %+v %v", rows, err)
	}
}

func TestQuizServiceChapterCatalogAndValidation(t *testing.T) {
	r := quizTestRepo(t)
	s := app.NewService(r)
	ctx := context.Background()
	seen := map[string]bool{}
	for _, chapter := range domain.QuizChapters() {
		round, err := s.StartQuiz(ctx, 1, uuid.NewString(), chapter.ID)
		if err != nil || len(round.QuestionIDs) != domain.QuizQuestionsPerRound || round.BankVersion != domain.QuizBankVersion() {
			t.Fatalf("chapter: %+v %v", round, err)
		}
		for _, id := range round.QuestionIDs {
			if seen[id] || domain.FindQuestion(id) == nil || domain.FindQuestion(id).ChapterID != chapter.ID {
				t.Fatalf("duplicate or missing question %s", id)
			}
			seen[id] = true
		}
	}
	if len(seen) != len(domain.QuizChapters())*domain.QuizQuestionsPerRound {
		t.Fatal("rounds did not sample the required number of distinct chapter questions")
	}
	if _, err := s.StartQuiz(ctx, 1, uuid.NewString(), "unknown"); !errors.Is(err, app.ErrInvalid) {
		t.Fatalf("invalid chapter %v", err)
	}
}
