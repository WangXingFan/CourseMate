package classroom

import (
	"context"
	"fmt"
	"path/filepath"
	"testing"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestAIActivitySuccessfulQuestionsRetriesEditsAndCopies(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "activity.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err = db.AutoMigrate(&models.Message{}); err != nil {
		t.Fatal(err)
	}
	start := time.Date(2026, 10, 19, 0, 0, 0, 0, domain.AIActivityLocation)
	create := func(id uint, user uint, role, run, status, branch string, source, parent *uint) uint {
		t.Helper()
		msg := models.Message{BaseModel: models.BaseModel{ID: id, CreatedAt: start.Add(time.Duration(id) * time.Minute)}, PublicID: fmt.Sprint(id), UserID: user, ConversationID: user, Role: role, RunID: run, Content: "content", Status: status, BranchReason: branch, SourceMessageID: source, ParentMessageID: parent}
		if err := db.Create(&msg).Error; err != nil {
			t.Fatal(err)
		}
		return id
	}
	root := create(1, 1, "user", "r1", "success", "default", nil, nil)
	answer := create(2, 1, "assistant", "r1", "success", "default", nil, &root)
	edit := create(3, 1, "user", "r2", "success", "edit", &root, nil)
	create(4, 1, "assistant", "r2", "success", "edit", nil, &edit)
	create(5, 1, "assistant", "r3", "success", "retry", &answer, &root)
	failure := create(6, 1, "user", "r4", "error", "default", nil, nil)
	failedAnswer := create(7, 1, "assistant", "r4", "error", "default", nil, &failure)
	create(8, 1, "assistant", "r5", "success", "retry", &failedAnswer, &failure)
	failOnly := create(9, 1, "user", "r6", "error", "default", nil, nil)
	create(10, 1, "assistant", "r6", "error", "default", nil, &failOnly)
	create(11, 1, "assistant", "title", "success", "default", nil, nil)
	copy := create(12, 1, "user", "", "success", "default", nil, nil)
	create(13, 1, "assistant", "", "success", "default", nil, &copy)
	other := create(14, 2, "user", "other", "success", "default", nil, nil)
	create(15, 2, "assistant", "other", "success", "default", nil, &other)
	empty := create(16, 1, "user", "empty", "success", "default", nil, nil)
	create(17, 1, "assistant", "empty", "success", "default", nil, &empty)
	if err := db.Model(&models.Message{}).Where("id = ?", 17).Update("content", " ").Error; err != nil {
		t.Fatal(err)
	}
	retry := create(18, 1, "user", "r7", "success", "retry", &edit, nil)
	create(19, 1, "assistant", "r7", "success", "retry", nil, &retry)
	create(20, 1, "assistant", "copied-retry", "success", "retry", nil, &copy)
	if err := db.Model(&models.Message{}).Where("id = ?", root).Update("learning_source", "correction").Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&models.Message{}).Where("id = ?", failure).Update("parent_message_id", answer).Error; err != nil {
		t.Fatal(err)
	}
	// Marking an edited copy as learning must not change the root's category.
	if err := db.Model(&models.Message{}).Where("id = ?", edit).Update("learning_source", "lesson").Error; err != nil {
		t.Fatal(err)
	}
	events, err := NewRepo(db).ListAIActivityEvents(context.Background(), []uint{1}, start.AddDate(0, 0, 7))
	if err != nil {
		t.Fatal(err)
	}
	report := domain.BuildAIActivity("c", []domain.Student{{ID: 1, JoinedAt: start}}, events, start, start.AddDate(0, 0, 7), start.AddDate(0, 0, 7))
	row := report.Students[0]
	if len(events) != 5 || row.ValidRounds != 2 || row.ActiveDays != 1 || *row.Final != 70 || row.Weeks[0].LearningRounds != 1 || row.Weeks[0].FollowupRounds != 1 {
		t.Fatalf("unexpected events/score: %+v %+v", events, row)
	}
}
