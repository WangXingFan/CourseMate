package classroom

import (
	"context"
	"encoding/json"
	"fmt"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/dberror"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"time"
)

func (r *Repo) CreatePracticeAssignment(ctx context.Context, input domain.PracticeAssignment) (*domain.PracticeAssignment, error) {
	payload, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}
	row := models.ClassroomPracticeAssignment{PublicID: input.PublicID, ClassroomID: input.ClassroomID, TeacherID: input.TeacherID, Payload: string(payload), Deadline: input.Deadline, CreatedAt: input.CreatedAt}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	input.ID = row.ID
	return &input, nil
}

func practiceAssignmentFromRow(row models.ClassroomPracticeAssignment) (domain.PracticeAssignment, error) {
	var item domain.PracticeAssignment
	if err := json.Unmarshal([]byte(row.Payload), &item); err != nil {
		return item, fmt.Errorf("practice assignment %s: %w", row.PublicID, err)
	}
	item.ID, item.Deadline = row.ID, row.Deadline
	return item, nil
}

func (r *Repo) ListPracticeAssignments(ctx context.Context, classroomID uint) ([]domain.PracticeAssignment, error) {
	var rows []models.ClassroomPracticeAssignment
	if err := r.db.WithContext(ctx).Where("classroom_id = ?", classroomID).Order("id DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	items := make([]domain.PracticeAssignment, 0, len(rows))
	for _, row := range rows {
		item, err := practiceAssignmentFromRow(row)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *Repo) GetPracticeAssignment(ctx context.Context, id string) (*domain.PracticeAssignment, error) {
	var row models.ClassroomPracticeAssignment
	if err := r.db.WithContext(ctx).Where("public_id = ?", id).First(&row).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	item, err := practiceAssignmentFromRow(row)
	return &item, err
}

func (r *Repo) ListPracticeSubmissions(ctx context.Context, assignmentID, studentID uint) ([]domain.PracticeSubmission, error) {
	query := r.db.WithContext(ctx).Where("assignment_id = ?", assignmentID)
	if studentID != 0 {
		query = query.Where("student_id = ?", studentID)
	}
	var rows []models.ClassroomPracticeSubmission
	if err := query.Order("id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	items := make([]domain.PracticeSubmission, 0, len(rows))
	for _, row := range rows {
		var item domain.PracticeSubmission
		if err := json.Unmarshal([]byte(row.Payload), &item); err != nil {
			return nil, fmt.Errorf("practice submission %d: %w", row.ID, err)
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *Repo) CreatePracticeSubmission(ctx context.Context, input domain.PracticeSubmission) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var row models.ClassroomPracticeAssignment
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&row, input.AssignmentID).Error; err != nil {
			return err
		}
		item, err := practiceAssignmentFromRow(row)
		if err != nil {
			return err
		}
		if !item.Includes(input.StudentID) {
			return repository.ErrNotFound
		}
		var membership models.ClassroomStudent
		if err := tx.Where("classroom_id = ? AND student_id = ?", row.ClassroomID, input.StudentID).First(&membership).Error; err != nil {
			return err
		}
		now := time.Now().UTC()
		if !now.Before(item.Deadline) {
			return repository.ErrInvalidInput
		}
		input.SubmittedAt = now
		for i := range input.Attempts {
			input.Attempts[i].CreatedAt = now
		}
		payload, err := json.Marshal(input)
		if err != nil {
			return err
		}
		if err := tx.Create(&models.ClassroomPracticeSubmission{AssignmentID: input.AssignmentID, StudentID: input.StudentID, Payload: string(payload), CreatedAt: now}).Error; err != nil {
			return err
		}
		for _, attempt := range input.Attempts {
			payload, err := json.Marshal(attempt)
			if err != nil {
				return err
			}
			if err := tx.Create(&models.LearningLessonAttempt{UserID: input.StudentID, AttemptID: attempt.ID, Version: attempt.Version, QuestionID: attempt.QuestionID, Payload: string(payload), CreatedAt: now}).Error; err != nil {
				return err
			}
		}
		return nil
	})
	return dberror.Translate(err)
}
