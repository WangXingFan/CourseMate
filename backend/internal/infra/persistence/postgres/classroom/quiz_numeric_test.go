package classroom

import (
	"context"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"path/filepath"
	"testing"
)

func TestNumericSubmissionPersistsInStudentAndTeacherViews(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "numeric.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err = db.AutoMigrate(&models.User{}, &models.Classroom{}, &models.ClassroomQuiz{}, &models.ClassroomQuizSubmission{}); err != nil {
		t.Fatal(err)
	}
	student := models.User{PublicID: "student", Username: "student", Role: "student", Status: "active"}
	if err = db.Create(&student).Error; err != nil {
		t.Fatal(err)
	}
	repo, ctx := NewRepo(db), context.Background()
	quiz, err := repo.CreateQuiz(ctx, domain.Quiz{PublicID: "numeric", ClassroomID: 1, TeacherID: 2, Title: "Numeric", Phase: domain.QuizPhaseInClass, Status: domain.QuizStatusOpen, Questions: []domain.QuizQuestion{{ID: "q", Fields: []domain.QuizField{{ID: "f1", Expected: 2.25}}}}})
	if err != nil {
		t.Fatal(err)
	}
	if err = repo.CreateQuizSubmission(ctx, domain.QuizSubmission{QuizID: quiz.ID, StudentID: student.ID, Answers: []int{-1}, FieldAnswers: map[string]map[string]string{"q": {"f1": "9/4"}}, Score: 1}); err != nil {
		t.Fatal(err)
	}
	view, err := repo.ListStudentQuizzes(ctx, 1, student.ID)
	if err != nil || len(view) != 1 || view[0].FieldAnswers["q"]["f1"] != "9/4" || view[0].Score != 1 {
		t.Fatalf("student persistence: %+v %v", view, err)
	}
	submissions, err := repo.ListQuizSubmissions(ctx, quiz.ID)
	if err != nil || len(submissions) != 1 || submissions[0].FieldAnswers["q"]["f1"] != "9/4" {
		t.Fatalf("teacher persistence: %+v %v", submissions, err)
	}
	if err = repo.UpdateQuizStatus(ctx, "numeric", 2, domain.QuizStatusClosed); err != nil {
		t.Fatal(err)
	}
	_, err = repo.CreateQuiz(ctx, domain.Quiz{PublicID: "retest", SourceQuizID: "numeric", ClassroomID: 1, TeacherID: 2, Title: "Retest", Phase: domain.QuizPhaseInClass, Status: domain.QuizStatusDraft, Questions: quiz.Questions})
	if err != nil {
		t.Fatalf("in-class retest persistence: %v", err)
	}
}
