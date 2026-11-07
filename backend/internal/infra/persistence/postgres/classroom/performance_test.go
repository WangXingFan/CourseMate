package classroom

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestPerformanceSnapshotRoundTripIsolationAndImmutability(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "performance.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err = db.AutoMigrate(&models.ClassroomPerformanceRecord{}); err != nil {
		t.Fatal(err)
	}
	r := NewRepo(db)
	ctx := context.Background()
	value := 82.3
	in := domain.PerformanceRecord{ID: "record", ClassroomID: 10, Title: "期中成绩", CreatedAt: time.Now(), Report: domain.PerformanceReport{Version: domain.PerformanceVersion, Students: []domain.PerformanceStudent{{StudentID: "student", Final: &value, Reason: "approved correction"}}}}
	if err = r.SavePerformanceRecord(ctx, in); err != nil {
		t.Fatal(err)
	}
	value = 0
	out, err := r.GetPerformanceRecord(ctx, 10, "record")
	if err != nil || *out.Report.Students[0].Final != 82.3 {
		t.Fatalf("snapshot changed: %+v %v", out, err)
	}
	if _, err = r.GetPerformanceRecord(ctx, 20, "record"); !errors.Is(err, repository.ErrNotFound) {
		t.Fatalf("cross-class read: %v", err)
	}
	items, err := r.ListPerformanceRecords(ctx, 10)
	if err != nil || len(items) != 1 || len(items[0].Report.Students) != 0 {
		t.Fatalf("listing: %+v %v", items, err)
	}
	if err = r.SavePerformanceRecord(ctx, in); err == nil {
		t.Fatal("snapshot overwritten")
	}
}
