package schema

import (
	"testing"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestRetireBundledSignalsPreservesTeacherLibraryAndFiles(t *testing.T) {
	for _, status := range []string{"enabled", "already_disabled"} {
		t.Run(status, func(t *testing.T) {
			testRetireBundledSignals(t, status == "enabled")
		})
	}
}

func testRetireBundledSignals(t *testing.T, enabled bool) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	defer sqlDB.Close()
	if err := db.AutoMigrate(&models.KnowledgeBase{}, &models.KnowledgeBaseFile{}, &models.FileObject{}, &models.SystemSetting{}); err != nil {
		t.Fatal(err)
	}
	rows := []models.KnowledgeBase{
		{PublicID: "kb_signals_systems", Scope: "builtin", Name: "信号与系统", Enabled: true, Revision: 3},
		{PublicID: "teacher_upload", Scope: "user", OwnerUserID: 9, Name: "信号与系统", Enabled: true, Revision: 1},
	}
	if err := db.Create(&rows).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&rows[0]).Update("enabled", enabled).Error; err != nil {
		t.Fatal(err)
	}
	file := models.FileObject{FileID: "shared_file", FileName: "lesson.md"}
	if err := db.Create(&file).Error; err != nil {
		t.Fatal(err)
	}
	links := []models.KnowledgeBaseFile{
		{KnowledgeBaseID: rows[0].ID, FileObjectID: file.ID},
		{KnowledgeBaseID: rows[1].ID, FileObjectID: file.ID},
	}
	if err := db.Create(&links).Error; err != nil {
		t.Fatal(err)
	}
	setting := models.SystemSetting{Namespace: "knowledgebase", Key: "default_knowledge_base_ids", Value: "kb_signals_systems,teacher_upload"}
	if err := db.Create(&setting).Error; err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if err := retireBundledSignalsKnowledgeBase(db); err != nil {
			t.Fatal(err)
		}
	}
	var count int64
	if err := db.Model(&models.KnowledgeBase{}).Where("id = ?", rows[0].ID).Count(&count).Error; err != nil || count != 0 {
		t.Fatalf("bundled library remains: %d %v", count, err)
	}
	var teacher models.KnowledgeBase
	if err := db.First(&teacher, rows[1].ID).Error; err != nil {
		t.Fatal(err)
	}
	if !teacher.Enabled || teacher.Revision != 1 || teacher.Name != rows[1].Name {
		t.Fatalf("teacher library changed: %+v", teacher)
	}
	var remainingLinks []models.KnowledgeBaseFile
	if err := db.Find(&remainingLinks).Error; err != nil || len(remainingLinks) != 1 || remainingLinks[0].KnowledgeBaseID != teacher.ID || remainingLinks[0].FileObjectID != file.ID {
		t.Fatalf("unexpected remaining associations: %+v %v", remainingLinks, err)
	}
	if err := db.First(&file, file.ID).Error; err != nil {
		t.Fatalf("shared file removed: %v", err)
	}
	if err := db.First(&setting, setting.ID).Error; err != nil || setting.Value != "teacher_upload" {
		t.Fatalf("defaults: %+v %v", setting, err)
	}
}
