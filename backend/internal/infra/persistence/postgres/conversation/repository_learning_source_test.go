package conversation

import (
	"context"
	"path/filepath"
	"testing"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/conversation"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestMessageLearningSourceRoundTrip(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "learning-source.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	connection, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = connection.Close() })
	if err := db.AutoMigrate(&models.Message{}); err != nil {
		t.Fatal(err)
	}
	r := NewRepo(db)
	message := domain.Message{UserID: 1, ConversationID: 1, PublicID: "learning-question", Role: "user", Content: "question", LearningSource: "practice"}
	if err := r.CreateMessage(context.Background(), &message); err != nil {
		t.Fatal(err)
	}
	var saved models.Message
	if err := db.First(&saved, message.ID).Error; err != nil {
		t.Fatal(err)
	}
	if saved.LearningSource != "practice" || message.LearningSource != "practice" {
		t.Fatal("learning source lost during persistence")
	}
}
