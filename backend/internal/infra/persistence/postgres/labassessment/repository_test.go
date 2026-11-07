package labassessment

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestClosureCutoffSurvivesStateWritesAndResetsOnReopen(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "labs.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	connection, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = connection.Close() })
	if err := db.AutoMigrate(&models.LabAssessment{}, &models.LabAssessmentState{}); err != nil {
		t.Fatal(err)
	}
	r, ctx := NewRepo(db), context.Background()
	if err := r.Create(ctx, domain.Assignment{ID: "lab", ClassroomID: "class", CourseID: "L1", Open: true, StartsAt: time.Now().Add(-time.Hour)}); err != nil {
		t.Fatal(err)
	}
	if err := r.SetOpen(ctx, "lab", false); err != nil {
		t.Fatal(err)
	}
	closed, err := r.Get(ctx, "lab")
	if err != nil || closed.Open || closed.ClosedAt == nil {
		t.Fatalf("closure: %+v %v", closed, err)
	}
	if _, err := r.Mutate(ctx, "lab", 1, func(_ domain.Assignment, state *domain.State) error {
		state.Task("L1-1").Correction = &domain.Correction{Score: 23}
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	if err := r.SetOpen(ctx, "lab", false); err != nil {
		t.Fatal(err)
	}
	again, err := r.Get(ctx, "lab")
	if err != nil || again.ClosedAt == nil || !again.ClosedAt.Equal(*closed.ClosedAt) {
		t.Fatalf("cutoff moved: %+v %v", again, err)
	}
	if err := r.SetOpen(ctx, "lab", true); err != nil {
		t.Fatal(err)
	}
	opened, err := r.Get(ctx, "lab")
	if err != nil || !opened.Open || opened.ClosedAt != nil {
		t.Fatalf("reopen: %+v %v", opened, err)
	}
}
