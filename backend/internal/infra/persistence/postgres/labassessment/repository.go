package labassessment

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"time"
)

type Repo struct{ db *gorm.DB }

func NewRepo(db *gorm.DB) *Repo { return &Repo{db} }
func assignment(row models.LabAssessment) domain.Assignment {
	return domain.Assignment{ID: row.ID, ClassroomID: row.ClassroomID, CourseID: row.CourseID, Version: row.Version, TeacherID: row.TeacherID, Open: row.Open, StartsAt: row.StartsAt, Deadline: row.Deadline, CreatedAt: row.CreatedAt}
}
func (r *Repo) Create(ctx context.Context, a domain.Assignment) error {
	row := models.LabAssessment{ID: a.ID, ClassroomID: a.ClassroomID, CourseID: a.CourseID, Version: a.Version, TeacherID: a.TeacherID, Open: a.Open, StartsAt: a.StartsAt, Deadline: a.Deadline, CreatedAt: a.CreatedAt}
	result := r.db.WithContext(ctx).Clauses(clause.OnConflict{DoNothing: true}).Create(&row)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrConflict
	}
	return nil
}
func (r *Repo) List(ctx context.Context, classID string) ([]domain.Assignment, error) {
	var rows []models.LabAssessment
	err := r.db.WithContext(ctx).Where("classroom_id = ?", classID).Order("created_at DESC").Find(&rows).Error
	result := []domain.Assignment{}
	for _, row := range rows {
		result = append(result, assignment(row))
	}
	return result, err
}
func (r *Repo) Get(ctx context.Context, id string) (domain.Assignment, error) {
	var row models.LabAssessment
	err := r.db.WithContext(ctx).First(&row, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		err = domain.ErrNotFound
	}
	return assignment(row), err
}
func (r *Repo) SetOpen(ctx context.Context, id string, open bool) error {
	return r.db.WithContext(ctx).Model(&models.LabAssessment{}).Where("id = ?", id).Update("open", open).Error
}
func decode(row models.LabAssessmentState) (domain.State, error) {
	s := domain.State{AssignmentID: row.AssignmentID, UserID: row.UserID, Tasks: map[string]*domain.TaskState{}}
	if row.Payload != "" {
		if err := json.Unmarshal([]byte(row.Payload), &s); err != nil {
			return s, fmt.Errorf("lab assessment %s user %d: %w", row.AssignmentID, row.UserID, err)
		}
	}
	return s, nil
}
func (r *Repo) ReadState(ctx context.Context, id string, user uint) (domain.State, error) {
	row := models.LabAssessmentState{AssignmentID: id, UserID: user}
	err := r.db.WithContext(ctx).Where("assignment_id = ? AND user_id = ?", id, user).First(&row).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return domain.State{}, err
	}
	return decode(row)
}
func (r *Repo) States(ctx context.Context, id string) ([]domain.State, error) {
	var rows []models.LabAssessmentState
	if err := r.db.WithContext(ctx).Where("assignment_id = ?", id).Find(&rows).Error; err != nil {
		return nil, err
	}
	result := []domain.State{}
	for _, row := range rows {
		s, err := decode(row)
		if err != nil {
			return nil, err
		}
		result = append(result, s)
	}
	return result, nil
}
func (r *Repo) Mutate(ctx context.Context, id string, user uint, fn func(domain.Assignment, *domain.State) error) (domain.State, error) {
	var state domain.State
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Updating the lock row also provides a write lock under the SQLite preview.
		lock := tx.Model(&models.LabAssessment{}).Where("id = ?", id).UpdateColumn("updated_at", time.Now().UTC())
		if lock.Error != nil {
			return lock.Error
		}
		if lock.RowsAffected == 0 {
			return domain.ErrNotFound
		}
		var row models.LabAssessment
		if err := tx.First(&row, "id = ?", id).Error; err != nil {
			return err
		}
		inner := NewRepo(tx)
		var err error
		state, err = inner.ReadState(ctx, id, user)
		if err != nil {
			return err
		}
		if err = fn(assignment(row), &state); err != nil {
			return err
		}
		payload, err := json.Marshal(state)
		if err != nil {
			return err
		}
		return tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "assignment_id"}, {Name: "user_id"}}, DoUpdates: clause.AssignmentColumns([]string{"payload", "updated_at"})}).Create(&models.LabAssessmentState{AssignmentID: id, UserID: user, Payload: string(payload), UpdatedAt: time.Now().UTC()}).Error
	})
	return state, err
}

var _ repository.LabAssessmentRepository = (*Repo)(nil)
