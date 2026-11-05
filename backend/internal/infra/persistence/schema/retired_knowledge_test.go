package schema

import (
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"testing"
)

func TestRetireBundledSignalsPreservesTeacherLibraryAndFiles(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	defer sqlDB.Close()
	if err := db.AutoMigrate(&models.KnowledgeBase{}, &models.KnowledgeBaseFile{}, &models.SystemSetting{}); err != nil {
		t.Fatal(err)
	}
	rows := []models.KnowledgeBase{
		{PublicID: "kb_signals_systems", Scope: "builtin", Name: "信号与系统", Enabled: true, Revision: 3},
		{PublicID: "teacher_upload", Scope: "user", OwnerUserID: 9, Name: "信号与系统", Enabled: true, Revision: 1},
	}
	if err := db.Create(&rows).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.KnowledgeBaseFile{KnowledgeBaseID: rows[0].ID, FileObjectID: 7}).Error; err != nil {
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
	var old, teacher models.KnowledgeBase
	if err := db.First(&old, rows[0].ID).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.First(&teacher, rows[1].ID).Error; err != nil {
		t.Fatal(err)
	}
	if old.Enabled || old.Revision != 4 || !teacher.Enabled || teacher.Revision != 1 {
		t.Fatalf("unexpected migration: old=%+v teacher=%+v", old, teacher)
	}
	var count int64
	if err := db.Model(&models.KnowledgeBaseFile{}).Count(&count).Error; err != nil || count != 1 {
		t.Fatalf("files changed: %d %v", count, err)
	}
	if err := db.First(&setting, setting.ID).Error; err != nil || setting.Value != "teacher_upload" {
		t.Fatalf("defaults: %+v %v", setting, err)
	}
}
