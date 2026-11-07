package learning

import (
	"context"
	"encoding/json"
	"path/filepath"
	"testing"

	classroom "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestMasteryReadsNumericClassroomAnswers(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "mastery.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.AutoMigrate(&models.LearningAttempt{}, &models.LearningLessonAttempt{}, &models.ClassroomQuiz{}, &models.ClassroomQuizSubmission{}); err != nil {
		t.Fatal(err)
	}
	questions, _ := json.Marshal([]classroom.QuizQuestion{{ID: "numeric", LessonID: "ss-1-1", Fields: []classroom.QuizField{{ID: "energy", Expected: 2.25}, {ID: "power", Expected: 2}}}})
	quiz := models.ClassroomQuiz{PublicID: "numeric", ClassroomID: 1, TeacherID: 1, Title: "Numeric", Status: "closed", Questions: string(questions)}
	if err := db.Create(&quiz).Error; err != nil {
		t.Fatal(err)
	}
	for i, fields := range []string{`{"numeric":{"energy":"9/4","power":"2"}}`, `{"numeric":{"energy":"2.25","power":"0"}}`, `{"numeric":{"energy":"0","power":"0"}}`} {
		if err := db.Create(&models.ClassroomQuizSubmission{QuizID: quiz.ID, StudentID: uint(i + 1), Answers: "[-1]", FieldAnswers: fields}).Error; err != nil {
			t.Fatal(err)
		}
	}
	evidence, err := NewRepo(db).MasteryEvidence(context.Background(), []uint{1, 2, 3}, 1, domain.MasteryPeriod{})
	if err != nil {
		t.Fatal(err)
	}
	if len(evidence) != 3 {
		t.Fatalf("expected three numeric submissions, got %d", len(evidence))
	}
	for _, item := range evidence {
		if item.Correct != (item.UserID == 1) {
			t.Fatalf("student %d: correct=%v; only the complete numeric answer is correct", item.UserID, item.Correct)
		}
	}
}
