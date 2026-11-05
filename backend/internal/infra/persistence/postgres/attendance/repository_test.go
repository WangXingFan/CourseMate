package attendance

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/attendance"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/attendance"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	classrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/classroom"
	userrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/user"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setup(t *testing.T) (*gorm.DB, *app.Service, *Repo, []models.User) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "attendance.db")+"?_busy_timeout=5000"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.AutoMigrate(&models.User{}, &models.UserCredential{}, &models.Classroom{}, &models.ClassroomStudent{}, &models.AttendanceSession{}, &models.AttendanceRecord{}); err != nil {
		t.Fatal(err)
	}
	users := []models.User{
		{PublicID: "teacher", Username: "teacher", Role: "teacher", Status: "active"},
		{PublicID: "other-teacher", Username: "other-teacher", Role: "teacher", Status: "active"},
		{PublicID: "student-a", Username: "20260001", DisplayName: "A", Role: "student", Status: "active"},
		{PublicID: "student-b", Username: "20260002", DisplayName: "B", Role: "student", Status: "active"},
		{PublicID: "outsider", Username: "20260003", Role: "student", Status: "active"},
	}
	if err := db.Create(&users).Error; err != nil {
		t.Fatal(err)
	}
	for _, u := range users {
		if err := db.Create(&models.UserCredential{UserID: u.ID, PasswordHash: "unused", PasswordAlgo: "bcrypt"}).Error; err != nil {
			t.Fatal(err)
		}
	}
	c := models.Classroom{PublicID: "class", TeacherID: users[0].ID, Name: "Signals"}
	if err := db.Create(&c).Error; err != nil {
		t.Fatal(err)
	}
	for _, u := range users[2:4] {
		if err := db.Create(&models.ClassroomStudent{ClassroomID: c.ID, StudentID: u.ID}).Error; err != nil {
			t.Fatal(err)
		}
	}
	r := NewRepo(db)
	return db, app.NewService(r, classrepo.NewRepo(db), userrepo.NewRepo(db)), r, users
}

func TestAttendanceIdentitySnapshotAndCorrections(t *testing.T) {
	db, s, repo, users := setup(t)
	ctx := context.Background()
	a, err := s.Create(ctx, users[0].ID, "class", "Lesson 1", 10, 3)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.Create(ctx, users[1].ID, "class", "Unauthorized", 5, 0); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("cross teacher create: %v", err)
	}
	if _, _, err := s.Report(ctx, users[1].ID, a.ID); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("cross teacher report: %v", err)
	}
	if _, _, err := s.Report(ctx, users[2].ID, a.ID); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("student code access: %v", err)
	}
	code, _ := a.Code(time.Now())
	if _, err := s.CheckIn(ctx, users[4].ID, a.ID, code); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("outsider: %v", err)
	}
	if err := db.Model(&models.UserCredential{}).Where("user_id = ?", users[2].ID).Update("must_reset_password", true).Error; err != nil {
		t.Fatal(err)
	}
	if _, err := s.CheckIn(ctx, users[2].ID, a.ID, code); !errors.Is(err, domain.ErrActivation) {
		t.Fatalf("initial password: %v", err)
	}
	if err := db.Model(&models.UserCredential{}).Where("user_id = ?", users[2].ID).Update("must_reset_password", false).Error; err != nil {
		t.Fatal(err)
	}
	first, err := s.CheckIn(ctx, users[2].ID, a.ID, code)
	if err != nil || first.Status != "present" || first.CheckedAt == nil {
		t.Fatalf("check in: %+v %v", first, err)
	}
	retry, err := s.CheckIn(ctx, users[2].ID, a.ID, "invalid")
	if err != nil || !retry.CheckedAt.Equal(*first.CheckedAt) {
		t.Fatalf("retry: %+v %v", retry, err)
	}
	if err := db.Where("student_id = ?", users[3].ID).Delete(&models.ClassroomStudent{}).Error; err != nil {
		t.Fatal(err)
	}
	if _, err := s.CheckIn(ctx, users[3].ID, a.ID, code); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("removed student: %v", err)
	}
	_, records, err := s.Report(ctx, users[0].ID, a.ID)
	if err != nil || len(records) != 2 {
		t.Fatalf("roster drift: %+v %v", records, err)
	}
	if err := db.Create(&models.ClassroomStudent{ClassroomID: a.ClassroomID, StudentID: users[4].ID}).Error; err != nil {
		t.Fatal(err)
	}
	if _, err := s.CheckIn(ctx, users[4].ID, a.ID, code); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("late roster addition: %v", err)
	}
	if _, err := s.Correct(ctx, users[1].ID, a.ID, users[2].PublicID, "absent", "wrong teacher"); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("cross teacher correction: %v", err)
	}
	corrected, err := s.Correct(ctx, users[0].ID, a.ID, users[2].PublicID, "absent", "Not present during roll call")
	if err != nil || len(corrected.Corrections) != 1 || corrected.Corrections[0].Previous != "present" || corrected.Corrections[0].ActorID != users[0].ID {
		t.Fatalf("audit: %+v %v", corrected, err)
	}
	if err := s.Close(ctx, users[0].ID, a.ID); err != nil {
		t.Fatal(err)
	}
	retry, err = s.CheckIn(ctx, users[2].ID, a.ID, code)
	if err != nil || retry.Status != "absent" {
		t.Fatalf("correction overwritten: %+v %v", retry, err)
	}
	items, err := s.StudentList(ctx, users[2].ID)
	if err != nil || len(items) != 1 || items[0].Record.StudentID != users[2].ID {
		t.Fatalf("student list: %+v %v", items, err)
	}
	stored, err := repo.Get(ctx, a.ID)
	if err != nil || stored.ClosedAt == nil {
		t.Fatalf("close: %+v %v", stored, err)
	}
}

func TestAttendanceExpiryAttemptsAndLateCheckIn(t *testing.T) {
	db, s, repo, users := setup(t)
	ctx := context.Background()
	a, err := s.Create(ctx, users[0].ID, "class", "Lesson 2", 10, 1)
	if err != nil {
		t.Fatal(err)
	}
	// Six invalid submissions cannot bypass the persistent per-student limit.
	for i := 0; i < 6; i++ {
		_, err := s.CheckIn(ctx, users[2].ID, a.ID, "bad-code")
		want := domain.ErrCode
		if i == 5 {
			want = domain.ErrAttempts
		}
		if !errors.Is(err, want) {
			t.Fatalf("attempt %d: %v", i, err)
		}
	}
	// Reset the stored window as if time advanced; a new code can be used.
	if err := db.Model(&models.AttendanceRecord{}).Where("session_id = ? AND student_id = ?", a.ID, users[2].ID).Update("attempt_window", 0).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&models.AttendanceSession{}).Where("id = ?", a.ID).Update("late_at", time.Now().Add(-time.Minute)).Error; err != nil {
		t.Fatal(err)
	}
	code, _ := a.Code(time.Now())
	r, err := s.CheckIn(ctx, users[2].ID, a.ID, code)
	if err != nil || r.Status != "late" {
		t.Fatalf("late: %+v %v", r, err)
	}
	if err := db.Model(&models.AttendanceSession{}).Where("id = ?", a.ID).Update("ends_at", time.Now().Add(-time.Second)).Error; err != nil {
		t.Fatal(err)
	}
	if _, err := s.CheckIn(ctx, users[3].ID, a.ID, code); !errors.Is(err, domain.ErrClosed) {
		t.Fatalf("expired session: %v", err)
	}
	b, err := s.Create(ctx, users[0].ID, "class", "Lesson 3", 10, 0)
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Close(ctx, users[0].ID, b.ID); err != nil {
		t.Fatal(err)
	}
	code, _ = b.Code(time.Now())
	if _, err := s.CheckIn(ctx, users[3].ID, b.ID, code); !errors.Is(err, domain.ErrClosed) {
		t.Fatalf("manually closed session: %v", err)
	}
	rows, err := repo.Records(ctx, b.ID)
	if err != nil || rows[0].CheckedAt != nil || rows[1].CheckedAt != nil {
		t.Fatalf("closed submission persisted: %+v %v", rows, err)
	}
}
