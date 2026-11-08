package learning

import (
	"context"
	"encoding/json"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	classroom "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	learningrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/learning"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestCorrectionReleaseIsolationRetryAndReview(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "corrections.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sql, _ := db.DB()
	t.Cleanup(func() { sql.Close() })
	if err = db.AutoMigrate(&models.LearningLessonAttempt{}, &models.ClassroomHomework{}, &models.ClassroomHomeworkSubmission{}, &models.ClassroomQuiz{}, &models.ClassroomQuizSubmission{}); err != nil {
		t.Fatal(err)
	}
	encode := func(value any) string {
		t.Helper()
		data, err := json.Marshal(value)
		if err != nil {
			t.Fatal(err)
		}
		return string(data)
	}
	now := time.Now().UTC()
	sourceTime := now.Add(-48 * time.Hour)
	question := classroom.HomeworkQuestion{ID: "choice", Kind: "choice", Prompt: "Choose", Options: []string{"yes", "no"}, Accepted: [][]string{{"0"}}, Points: 10, Explanation: "Reason"}
	hw := models.ClassroomHomework{PublicID: "homework", ClassroomID: 1, TeacherID: 2, BankID: "test", Title: "Homework", Questions: encode([]classroom.HomeworkQuestion{question}), StartsAt: sourceTime.Add(-time.Hour), Deadline: now.Add(-time.Hour)}
	if err = db.Create(&hw).Error; err != nil {
		t.Fatal(err)
	}
	sub := models.ClassroomHomeworkSubmission{HomeworkID: hw.ID, StudentID: 1, Answers: encode([][]string{{"1"}}), Results: encode([]classroom.HomeworkResult{{QuestionID: "choice", Total: 10, Score: 0, Correct: []bool{false}}}), Score: 0, CreatedAt: sourceTime}
	if err = db.Create(&sub).Error; err != nil {
		t.Fatal(err)
	}
	repo := learningrepo.NewRepo(db)
	s := NewService(repo)
	s.now = func() time.Time { return now }
	ctx := context.Background()
	if list, err := s.Corrections(ctx, 1); err != nil || len(list) != 0 {
		t.Fatalf("unreleased homework visible: %+v %v", list, err)
	}
	if err = db.Model(&hw).Update("feedback_at", now).Error; err != nil {
		t.Fatal(err)
	}
	items, err := s.Corrections(ctx, 1)
	if err != nil || len(items) != 1 {
		t.Fatalf("released homework missing: %+v %v", items, err)
	}
	if _, err = s.SubmitCorrection(ctx, 9, uuid.NewString(), items[0].ID, map[string]string{"choice": "0"}); err == nil {
		t.Fatal("other user corrected this homework")
	}
	id := uuid.NewString()
	result, err := s.SubmitCorrection(ctx, 1, id, items[0].ID, map[string]string{"choice": "0"})
	if err != nil || result.ReviewStage != 1 || result.Results[0].Expected != "yes" || !result.NextReviewAt.Equal(now.Add(72*time.Hour)) {
		t.Fatalf("first review: %+v %v", result, err)
	}
	retry, err := s.SubmitCorrection(ctx, 1, id, items[0].ID, map[string]string{"choice": "0"})
	if err != nil || retry.ReviewStage != 1 || !retry.CreatedAt.Equal(result.CreatedAt) {
		t.Fatal("retry changed review")
	}
	if _, err = s.SubmitCorrection(ctx, 1, id, items[0].ID, map[string]string{"choice": "1"}); err != ErrConflict {
		t.Fatalf("changed retry accepted: %v", err)
	}
	early, err := s.SubmitCorrection(ctx, 1, uuid.NewString(), items[0].ID, map[string]string{"choice": "0"})
	if err != nil || early.ReviewStage != 1 || !early.NextReviewAt.Equal(*result.NextReviewAt) {
		t.Fatal("early practice advanced review")
	}
	now = *result.NextReviewAt
	due, err := s.SubmitCorrection(ctx, 1, uuid.NewString(), items[0].ID, map[string]string{"choice": "0"})
	if err != nil || due.ReviewStage != 2 {
		t.Fatalf("due review: %+v %v", due, err)
	}
	wrong, err := s.SubmitCorrection(ctx, 1, uuid.NewString(), items[0].ID, map[string]string{"choice": "1"})
	if err != nil || wrong.ReviewStage != 0 || !wrong.NextReviewAt.Equal(now.Add(24*time.Hour)) {
		t.Fatal("mistake did not reset review")
	}
	var official models.ClassroomHomeworkSubmission
	if err = db.First(&official, sub.ID).Error; err != nil || official.Score != 0 || official.Answers != sub.Answers || official.Results != sub.Results {
		t.Fatal("correction changed official submission")
	}
	// A later correct practice answer does not erase a pending spaced review.
	bank := domain.FindPracticeBank("lesson:ss-1-1", "zh-CN")
	q := bank.Questions[0]
	attempt := domain.LessonAttempt{ID: uuid.NewString(), UserID: 1, Version: domain.PracticeBankVersion, QuestionID: q.ID, ConceptID: bank.Concept.ID, LessonID: bank.Concept.LessonID, Score: 0, Total: 1, Answers: map[string]string{"choice": strconv.Itoa((q.Answer + 1) % len(q.Options))}, CreatedAt: now}
	if _, err = repo.SaveLessonAttempt(ctx, attempt); err != nil {
		t.Fatal(err)
	}
	attempt.ID = uuid.NewString()
	attempt.Score = 1
	attempt.CreatedAt = now.Add(time.Minute)
	if _, err = repo.SaveLessonAttempt(ctx, attempt); err != nil {
		t.Fatal(err)
	}
	list, err := s.Corrections(ctx, 1)
	if err != nil || len(list) != 2 {
		t.Fatalf("successful practice erased spaced review: %+v %v", list, err)
	}
}
