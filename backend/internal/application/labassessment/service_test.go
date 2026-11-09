package labassessment

import (
	"context"
	"errors"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	classrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/classroom"
	labrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/labassessment"
	userrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/user"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"path/filepath"
	"reflect"
	"strconv"
	"sync"
	"testing"
	"time"
)

func setup(t *testing.T) (*Service, *gorm.DB) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "lab.db")+"?_busy_timeout=5000&_journal_mode=WAL"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	if err = db.AutoMigrate(&models.User{}, &models.Classroom{}, &models.ClassroomStudent{}, &models.LabAssessment{}, &models.LabAssessmentState{}); err != nil {
		t.Fatal(err)
	}
	for _, u := range []models.User{{BaseModel: models.BaseModel{ID: 1}, PublicID: "teacher", Username: "teacher", Role: "teacher"}, {BaseModel: models.BaseModel{ID: 2}, PublicID: "student", Username: "student", Role: "student"}, {BaseModel: models.BaseModel{ID: 3}, PublicID: "other", Username: "other", Role: "student"}} {
		if err = db.Create(&u).Error; err != nil {
			t.Fatal(err)
		}
	}
	for _, c := range []models.Classroom{{ControlPlaneModel: models.ControlPlaneModel{ID: 1}, PublicID: "class", TeacherID: 1, Name: "class", Lab1Open: true, Lab2Open: true, Lab3Open: true}, {ControlPlaneModel: models.ControlPlaneModel{ID: 2}, PublicID: "other", TeacherID: 1, Name: "other"}} {
		if err = db.Create(&c).Error; err != nil {
			t.Fatal(err)
		}
	}
	if err = db.Create(&[]models.ClassroomStudent{{StudentID: 2, ClassroomID: 1}, {StudentID: 3, ClassroomID: 2}}).Error; err != nil {
		t.Fatal(err)
	}
	sql, _ := db.DB()
	t.Cleanup(func() { sql.Close() })
	return NewService(labrepo.NewRepo(db), classrepo.NewRepo(db), userrepo.NewRepo(db)), db
}
func key(p domain.Paper) map[string]string {
	a := map[string]string{}
	for _, f := range p.Fields {
		if f.Kind == "choice" {
			a[f.ID] = f.Answer
		} else {
			a[f.ID] = strconv.FormatFloat(f.Expected, 'g', 17, 64)
		}
	}
	return a
}
func TestSubmitWithSingleDatabaseConnection(t *testing.T) {
	s, db := setup(t)
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.SetMaxOpenConns(1)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	a, err := s.Publish(ctx, 1, "class", "L1", time.Time{}, nil)
	if err != nil {
		t.Fatal(err)
	}
	state, err := s.Start(ctx, 2, a.ID, "L1-1")
	if err != nil {
		t.Fatal(err)
	}
	attempt := state.Task("L1-1").Attempts[0]
	if _, err = s.Submit(ctx, 2, a.ID, "L1-1", attempt.ID, uuid.NewString(), key(attempt.Paper), false); err != nil {
		t.Fatal("submit with a single connection", err)
	}
	_, state, err = s.Read(ctx, 2, a.ID)
	if err != nil {
		t.Fatal(err)
	}
	if result := state.Task("L1-1").Attempts[0].Result; result == nil || result.Score != 20 {
		t.Fatalf("persisted score: %+v", result)
	}
}

func TestDashboardProgressDoesNotForfeitAttempts(t *testing.T) {
	s, _ := setup(t)
	ctx := context.Background()
	a, err := s.Publish(ctx, 1, "class", "L1", time.Time{}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Start(ctx, 2, a.ID, "L1-1"); err != nil {
		t.Fatal(err)
	}
	if err = s.SetOpen(ctx, 1, a.ID, false); err != nil {
		t.Fatal(err)
	}
	task, progress, err := s.StudentPendingTask(ctx, 2, a.ID)
	if err != nil || task != "L1-1" || !progress {
		t.Fatalf("pending task: %s %v %v", task, progress, err)
	}
	if _, _, err = s.StudentPendingTask(ctx, 3, a.ID); err == nil {
		t.Fatal("other class accessed progress")
	}
	if err = s.SetOpen(ctx, 1, a.ID, true); err != nil {
		t.Fatal(err)
	}
	_, state, err := s.Read(ctx, 2, a.ID)
	if err != nil || state.Task("L1-1").Explained {
		t.Fatal("dashboard progress forfeited attempts")
	}
}

func TestAssessmentLifecycle(t *testing.T) {
	s, _ := setup(t)
	ctx := context.Background()
	a, err := s.Publish(ctx, 1, "class", "L1", time.Time{}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Publish(ctx, 2, "class", "L2", time.Time{}, nil); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("student publication %v", err)
	}
	if _, _, err = s.Read(ctx, 3, a.ID); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("class isolation %v", err)
	}
	var wg sync.WaitGroup
	for range 2 {
		wg.Go(func() {
			if _, e := s.Start(ctx, 2, a.ID, "L1-1"); e != nil {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	_, state, err := s.Read(ctx, 2, a.ID)
	if err != nil {
		t.Fatal(err)
	}
	task := state.Task("L1-1")
	if len(task.Attempts) != 1 {
		t.Fatal("concurrent starts created multiple papers")
	}
	first := task.Attempts[0]
	bad := key(first.Paper)
	bad["peakTime"] = "wrong format"
	if _, err = s.Submit(ctx, 2, a.ID, "L1-1", first.ID, uuid.NewString(), bad, false); !errors.Is(err, domain.ErrInvalid) {
		t.Fatal(err)
	}
	answers := key(first.Paper)
	request := uuid.NewString()
	state, err = s.Submit(ctx, 2, a.ID, "L1-1", first.ID, request, answers, false)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Submit(ctx, 2, a.ID, "L1-1", first.ID, request, answers, false); err != nil {
		t.Fatal("idempotent retry", err)
	}
	changed := key(first.Paper)
	changed["height"] = "99"
	if _, err = s.Submit(ctx, 2, a.ID, "L1-1", first.ID, request, changed, false); !errors.Is(err, domain.ErrConflict) {
		t.Fatal("changed retry", err)
	}
	state, err = s.Start(ctx, 2, a.ID, "L1-1")
	if err != nil {
		t.Fatal(err)
	}
	second := state.Task("L1-1").Attempts[1]
	if reflect.DeepEqual(first.Paper.Parameters, second.Paper.Parameters) || first.Paper.Variant%2 == second.Paper.Variant%2 {
		t.Fatal("replacement did not change parameters and concept variant")
	}
	if _, err = s.Submit(ctx, 2, a.ID, "L1-1", second.ID, uuid.NewString(), map[string]string{}, false); !errors.Is(err, domain.ErrInvalid) {
		t.Fatal("blank confirmation missing", err)
	}
	state, err = s.Submit(ctx, 2, a.ID, "L1-1", second.ID, uuid.NewString(), map[string]string{}, true)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Start(ctx, 2, a.ID, "L1-1"); !errors.Is(err, domain.ErrLimit) {
		t.Fatal("third attempt", err)
	}
	for _, checkpoint := range []string{"O1", "O2"} {
		i := 0
		if checkpoint == "O2" {
			i = 1
		}
		for range 2 {
			state, err = s.Checkpoint(ctx, 2, a.ID, "L1-1", checkpoint, key(domain.Checkpoints("L1-1")[i].Paper))
			if err != nil {
				t.Fatal(err)
			}
		}
	}
	_, _, _, total := state.Task("L1-1").Scores()
	if total != 25 {
		t.Fatal("duplicate operation credit", total)
	}
	if err = s.Correct(ctx, 1, a.ID, "student", "L1-1", 23, "复核"); err != nil {
		t.Fatal(err)
	}
	_, state, err = s.Read(ctx, 2, a.ID)
	if err != nil {
		t.Fatal(err)
	}
	if state.Task("L1-1").Attempts[0].Result.Score != 20 || len(state.Task("L1-1").Corrections) != 1 {
		t.Fatal("lost original evidence")
	}
}
func TestClosureExplanationAndDeadline(t *testing.T) {
	s, db := setup(t)
	ctx := context.Background()
	a, err := s.Publish(ctx, 1, "class", "L2", time.Time{}, nil)
	if err != nil {
		t.Fatal(err)
	}
	st, err := s.Start(ctx, 2, a.ID, "L2-1")
	if err != nil {
		t.Fatal(err)
	}
	at := st.Task("L2-1").Attempts[0]
	if err = db.Model(&models.Classroom{}).Where("public_id = ?", "class").Update("lab2_open", false).Error; err != nil {
		t.Fatal(err)
	}
	if _, err = s.Submit(ctx, 2, a.ID, "L2-1", at.ID, uuid.NewString(), key(at.Paper), false); !errors.Is(err, domain.ErrClosed) {
		t.Fatal("experiment gate", err)
	}
	if err = db.Model(&models.Classroom{}).Where("public_id = ?", "class").Update("lab2_open", true).Error; err != nil {
		t.Fatal(err)
	}
	if _, err = s.Submit(ctx, 2, a.ID, "L2-1", at.ID, uuid.NewString(), key(at.Paper), false); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Explain(ctx, 2, a.ID, "L2-1"); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Start(ctx, 2, a.ID, "L2-1"); !errors.Is(err, domain.ErrLimit) {
		t.Fatal("explanation did not forfeit", err)
	}
	if _, err = s.Start(ctx, 2, a.ID, "L2-2"); err != nil {
		t.Fatal(err)
	}
	if err = s.SetOpen(ctx, 1, a.ID, false); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Start(ctx, 2, a.ID, "L2-3"); !errors.Is(err, domain.ErrClosed) {
		t.Fatal(err)
	}
	_, st, err = s.Read(ctx, 2, a.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !st.Task("L2-2").Explained {
		t.Fatal("closed read must forfeit before reveal")
	}
	if err = s.SetOpen(ctx, 1, a.ID, true); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Start(ctx, 2, a.ID, "L2-2"); !errors.Is(err, domain.ErrLimit) {
		t.Fatal("reopen after reveal", err)
	}
	deadline := time.Now().Add(time.Minute)
	b, err := s.Publish(ctx, 1, "class", "L3", time.Time{}, &deadline)
	if err != nil {
		t.Fatal(err)
	}
	s.now = func() time.Time { return deadline }
	if _, err = s.Start(ctx, 2, b.ID, "L3-1"); !errors.Is(err, domain.ErrClosed) {
		t.Fatal("deadline", err)
	}
}
