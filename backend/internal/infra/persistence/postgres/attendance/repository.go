package attendance

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/attendance"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/gorm"
)

type Repo struct{ db *gorm.DB }

func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }

func session(row models.AttendanceSession) domain.Session {
	return domain.Session{ID: row.ID, ClassroomID: row.ClassroomID, TeacherID: row.TeacherID, Title: row.Title, Secret: row.Secret, StartsAt: row.StartsAt, EndsAt: row.EndsAt, LateAt: row.LateAt, ClosedAt: row.ClosedAt}
}
func record(row models.AttendanceRecord) (domain.Record, error) {
	r := domain.Record{SessionID: row.SessionID, StudentID: row.StudentID, StudentPublicID: row.StudentPublicID, Username: row.Username, DisplayName: row.DisplayName, Status: row.Status, CheckedAt: row.CheckedAt, AttemptWindow: row.AttemptWindow, FailedAttempts: row.FailedAttempts, Corrections: []domain.Correction{}}
	if err := json.Unmarshal([]byte(row.Corrections), &r.Corrections); err != nil {
		return r, fmt.Errorf("attendance %s student %d corrections: %w", row.SessionID, row.StudentID, err)
	}
	return r, nil
}
func (r *Repo) Create(ctx context.Context, s domain.Session) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Lock the classroom while taking the expected-roster snapshot.
		lock := tx.Model(&models.Classroom{}).Where("id = ? AND teacher_id = ?", s.ClassroomID, s.TeacherID).UpdateColumn("updated_at", time.Now().UTC())
		if lock.Error != nil {
			return lock.Error
		}
		if lock.RowsAffected == 0 {
			return domain.ErrNotFound
		}
		row := models.AttendanceSession{ID: s.ID, ClassroomID: s.ClassroomID, TeacherID: s.TeacherID, Title: s.Title, Secret: s.Secret, StartsAt: s.StartsAt, EndsAt: s.EndsAt, LateAt: s.LateAt}
		if err := tx.Create(&row).Error; err != nil {
			return err
		}
		var users []models.User
		if err := tx.Joins("JOIN classroom_students ON classroom_students.student_id = identity_users.id").Where("classroom_students.classroom_id = ? AND identity_users.role = ?", s.ClassroomID, "student").Find(&users).Error; err != nil {
			return err
		}
		for _, u := range users {
			row := models.AttendanceRecord{SessionID: s.ID, StudentID: u.ID, StudentPublicID: u.PublicID, Username: u.Username, DisplayName: u.DisplayName, Status: "absent", Corrections: "[]"}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
func (r *Repo) Get(ctx context.Context, id string) (domain.Session, error) {
	var row models.AttendanceSession
	err := r.db.WithContext(ctx).First(&row, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		err = domain.ErrNotFound
	}
	return session(row), err
}
func (r *Repo) List(ctx context.Context, classID uint) ([]domain.Session, error) {
	var rows []models.AttendanceSession
	err := r.db.WithContext(ctx).Where("classroom_id = ?", classID).Order("starts_at DESC, id DESC").Find(&rows).Error
	items := []domain.Session{}
	for _, row := range rows {
		items = append(items, session(row))
	}
	return items, err
}
func (r *Repo) Records(ctx context.Context, id string) ([]domain.Record, error) {
	var rows []models.AttendanceRecord
	if err := r.db.WithContext(ctx).Where("session_id = ?", id).Order("username, student_id").Find(&rows).Error; err != nil {
		return nil, err
	}
	items := []domain.Record{}
	for _, row := range rows {
		item, err := record(row)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}
func (r *Repo) StudentList(ctx context.Context, classID, studentID uint) ([]domain.StudentSession, error) {
	sessions, err := r.List(ctx, classID)
	if err != nil {
		return nil, err
	}
	var rows []models.AttendanceRecord
	if err := r.db.WithContext(ctx).Where("student_id = ?", studentID).Find(&rows).Error; err != nil {
		return nil, err
	}
	byID := map[string]models.AttendanceRecord{}
	for _, row := range rows {
		byID[row.SessionID] = row
	}
	items := []domain.StudentSession{}
	for _, s := range sessions {
		if row, ok := byID[s.ID]; ok {
			item, err := record(row)
			if err != nil {
				return nil, err
			}
			items = append(items, domain.StudentSession{Session: s, Record: item})
		}
	}
	return items, nil
}
func (r *Repo) Close(ctx context.Context, id string, now time.Time) error {
	return r.db.WithContext(ctx).Model(&models.AttendanceSession{}).Where("id = ? AND closed_at IS NULL", id).Update("closed_at", now).Error
}
func (r *Repo) Mutate(ctx context.Context, id, studentPublicID string, fn func(domain.Session, *domain.Record, bool) error) (domain.Record, error) {
	var result domain.Record
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// A write lock works on both PostgreSQL and SQLite and serializes close,
		// duplicate submissions and corrections against this session.
		lock := tx.Model(&models.AttendanceSession{}).Where("id = ?", id).UpdateColumn("updated_at", time.Now().UTC())
		if lock.Error != nil {
			return lock.Error
		}
		if lock.RowsAffected == 0 {
			return domain.ErrNotFound
		}
		s, err := NewRepo(tx).Get(ctx, id)
		if err != nil {
			return err
		}
		var row models.AttendanceRecord
		if err := tx.Where("session_id = ? AND student_public_id = ?", id, studentPublicID).First(&row).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return domain.ErrNotFound
			}
			return err
		}
		result, err = record(row)
		if err != nil {
			return err
		}
		var membership int64
		if err := tx.Model(&models.ClassroomStudent{}).Where("classroom_id = ? AND student_id = ?", s.ClassroomID, row.StudentID).Count(&membership).Error; err != nil {
			return err
		}
		if err := fn(s, &result, membership > 0); err != nil {
			return err
		}
		payload, err := json.Marshal(result.Corrections)
		if err != nil {
			return err
		}
		return tx.Model(&row).Updates(map[string]any{"status": result.Status, "checked_at": result.CheckedAt, "corrections": string(payload), "attempt_window": result.AttemptWindow, "failed_attempts": result.FailedAttempts}).Error
	})
	return result, err
}
