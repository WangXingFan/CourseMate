package classroom

import (
	"context"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
)

func (r *Repo) SetClassroomExperiment(ctx context.Context, publicID string, teacherID uint, courseID string, open bool) error {
	column := map[string]string{"L1": "lab1_open", "L2": "lab2_open", "L3": "lab3_open"}[courseID]
	if column == "" || publicID == "" || teacherID == 0 {
		return repository.ErrInvalidInput
	}
	result := r.db.WithContext(ctx).Model(&models.Classroom{}).
		Where("public_id = ? AND teacher_id = ?", publicID, teacherID).Update(column, open)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return repository.ErrNotFound
	}
	return nil
}
