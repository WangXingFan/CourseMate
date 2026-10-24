package conversation

import (
	"context"
	"testing"

	domainconversation "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/conversation"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/sqlitevec"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestMarkEmbeddedFilesStaleKeepsCurrentSignatureReady(t *testing.T) {
	db := openConversationSQLiteVectorTestDB(t)
	repo := NewRepo(db)
	files := []models.FileObject{
		{BaseModel: models.BaseModel{ID: 101}, FileID: "old-ready", UserID: 1, FileName: "old.txt", Status: "active", EmbedStatus: "ready"},
		{BaseModel: models.BaseModel{ID: 102}, FileID: "current-ready", UserID: 1, FileName: "current.txt", Status: "active", EmbedStatus: "ready"},
		{BaseModel: models.BaseModel{ID: 103}, FileID: "old-processing", UserID: 1, FileName: "processing.txt", Status: "active", EmbedStatus: "processing"},
	}
	if err := db.Create(&files).Error; err != nil {
		t.Fatalf("create files: %v", err)
	}
	chunks := []models.FileChunk{
		{FileObjID: files[0].ID, UserID: 1, ChunkIndex: 0, Content: "old", EmbeddingSignature: "old-space"},
		{FileObjID: files[1].ID, UserID: 1, ChunkIndex: 0, Content: "current", EmbeddingSignature: "current-space"},
		{FileObjID: files[2].ID, UserID: 1, ChunkIndex: 0, Content: "old processing", EmbeddingSignature: "old-space"},
	}
	if err := db.Create(&chunks).Error; err != nil {
		t.Fatalf("create chunks: %v", err)
	}

	updated, err := repo.MarkEmbeddedFilesStale(context.Background(), "current-space")
	if err != nil {
		t.Fatalf("MarkEmbeddedFilesStale() error = %v", err)
	}
	if updated != 2 {
		t.Fatalf("updated = %d, want 2", updated)
	}
	statuses := make(map[string]string, len(files))
	var got []models.FileObject
	if err = db.Order("id ASC").Find(&got).Error; err != nil {
		t.Fatalf("load files: %v", err)
	}
	for _, file := range got {
		statuses[file.FileID] = file.EmbedStatus
	}
	if statuses["old-ready"] != "stale" || statuses["old-processing"] != "stale" || statuses["current-ready"] != "ready" {
		t.Fatalf("unexpected statuses: %#v", statuses)
	}
}

func TestFileEmbeddingQueueStateAndProcessingProjection(t *testing.T) {
	db := openConversationSQLiteVectorTestDB(t)
	repo := NewRepo(db)
	ctx := context.Background()
	file := models.FileObject{
		FileID:          "file_queue_state",
		UserID:          7,
		FileName:        "manual.md",
		MimeType:        "text/markdown",
		FileCategory:    "text",
		StoragePath:     "uploads/manual.md",
		Status:          "active",
		ProcessingReady: true,
		ExtractStatus:   "ready",
		EmbedStatus:     "none",
	}
	if err := db.Create(&file).Error; err != nil {
		t.Fatalf("create file: %v", err)
	}

	queued, err := repo.QueueFileEmbedding(ctx, 7, file.FileID, "model@1536")
	if err != nil || !queued {
		t.Fatalf("queue embedding: queued=%v err=%v", queued, err)
	}
	if duplicate, duplicateErr := repo.QueueFileEmbedding(ctx, 7, file.FileID, "model@1536"); duplicateErr != nil || duplicate {
		t.Fatalf("duplicate queue must be rejected: queued=%v err=%v", duplicate, duplicateErr)
	}

	statuses, err := repo.GetActiveFileProcessingStatusesByIDs(ctx, 7, []string{file.FileID})
	if err != nil || len(statuses) != 1 {
		t.Fatalf("load processing projection: statuses=%#v err=%v", statuses, err)
	}
	status := statuses[0]
	if status.FileName != file.FileName || status.MimeType != file.MimeType ||
		status.FileCategory != file.FileCategory || status.StoragePath != file.StoragePath ||
		status.Status != "active" || !status.ProcessingReady || status.ExtractStatus != "ready" ||
		status.EmbedStatus != "queued" || status.EmbedSignature != "model@1536" {
		t.Fatalf("incomplete processing projection: %#v", status)
	}

	claimed, err := repo.ClaimFileEmbedding(ctx, 7, file.FileID, "model@1536")
	if err != nil || !claimed {
		t.Fatalf("claim queued embedding: claimed=%v err=%v", claimed, err)
	}
	var stored models.FileObject
	if err = db.Where("id = ?", file.ID).Take(&stored).Error; err != nil {
		t.Fatalf("load claimed file: %v", err)
	}
	if stored.EmbedStatus != "processing" || stored.EmbedSignature != "model@1536" {
		t.Fatalf("unexpected claimed state: %#v", stored)
	}
}

func TestFileEmbeddingGenerationRejectsSupersededPublisher(t *testing.T) {
	db := openConversationSQLiteVectorTestDB(t)
	repo := NewRepo(db)
	ctx := context.Background()
	file := models.FileObject{
		FileID:         "file_generation",
		UserID:         1,
		Status:         "active",
		EmbedStatus:    "processing",
		EmbedSignature: "space-4096",
	}
	if err := db.Create(&file).Error; err != nil {
		t.Fatalf("create file: %v", err)
	}

	claimed, err := repo.ClaimFileEmbedding(ctx, 1, file.FileID, "space-1536")
	if err != nil || !claimed {
		t.Fatalf("claim new vector space: claimed=%v err=%v", claimed, err)
	}
	oldChunks := []domainconversation.FileChunk{{FileObjID: file.ID, UserID: 1, Content: "old", EmbeddingSignature: "space-4096"}}
	if published, publishErr := repo.ReplaceFileChunks(ctx, file.ID, "space-4096", oldChunks, [][]float32{{1, 0}}); publishErr != nil || published {
		t.Fatalf("superseded publisher must be rejected: published=%v err=%v", published, publishErr)
	}
	if updated, updateErr := repo.UpdateFileObjectEmbedStatus(ctx, 1, file.FileID, "space-4096", "ready", ""); updateErr != nil || updated {
		t.Fatalf("superseded status update must be rejected: updated=%v err=%v", updated, updateErr)
	}

	newChunks := []domainconversation.FileChunk{{FileObjID: file.ID, UserID: 1, Content: "new", EmbeddingSignature: "space-1536"}}
	if published, publishErr := repo.ReplaceFileChunks(ctx, file.ID, "space-1536", newChunks, [][]float32{{0, 1}}); publishErr != nil || !published {
		t.Fatalf("current publisher must succeed: published=%v err=%v", published, publishErr)
	}
	if updated, updateErr := repo.UpdateFileObjectEmbedStatus(ctx, 1, file.FileID, "space-1536", "ready", ""); updateErr != nil || !updated {
		t.Fatalf("current status update must succeed: updated=%v err=%v", updated, updateErr)
	}

	var stored models.FileChunk
	if err := db.Where("file_obj_id = ?", file.ID).Take(&stored).Error; err != nil {
		t.Fatalf("load current chunk: %v", err)
	}
	if stored.Content != "new" || stored.EmbeddingSignature != "space-1536" {
		t.Fatalf("unexpected stored chunk: %#v", stored)
	}
}

func openConversationSQLiteVectorTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	sqlitevec.Register()
	db, err := gorm.Open(sqlite.Open("file:conversation_vector?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() {
		sqlDB, dbErr := db.DB()
		if dbErr == nil {
			_ = sqlDB.Close()
		}
	})
	if err := db.AutoMigrate(
		&models.FileObject{},
		&models.FileChunk{},
		&models.Message{},
		&models.KnowledgeBase{},
		&models.KnowledgeBaseFile{},
	); err != nil {
		t.Fatalf("migrate models: %v", err)
	}
	if err := sqlitevec.Migrate(db); err != nil {
		t.Fatalf("migrate sqlite vectors: %v", err)
	}
	return db
}
