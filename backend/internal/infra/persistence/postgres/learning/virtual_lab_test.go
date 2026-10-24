package learning

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestVirtualLabSurvivesDatabaseReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "lab.db")
	open := func() *gorm.DB {
		t.Helper()
		db, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
		if err != nil {
			t.Fatal(err)
		}
		return db
	}
	first := open()
	if err := first.AutoMigrate(&models.LearningVirtualLab{}); err != nil {
		t.Fatal(err)
	}
	// JSON validity belongs to the application boundary, storage must preserve bytes.
	document := `{"evidence":"实验数据"}`
	saved, err := NewRepo(first).SaveVirtualLab(context.Background(), 17, 0, document)
	if err != nil {
		t.Fatal(err)
	}
	connection, _ := first.DB()
	if err := connection.Close(); err != nil {
		t.Fatal(err)
	}
	second := open()
	connection, _ = second.DB()
	defer connection.Close()
	restored, err := NewRepo(second).GetVirtualLab(context.Background(), 17)
	if err != nil || restored.Document != document || restored.Revision != saved.Revision || !restored.UpdatedAt.Equal(*saved.UpdatedAt) {
		t.Fatalf("database reopen lost record: %+v %v", restored, err)
	}
}
