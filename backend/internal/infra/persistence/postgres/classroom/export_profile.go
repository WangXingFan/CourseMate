package classroom

import (
	"context"
	"encoding/json"
	"fmt"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/dberror"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
)

func (r *Repo) GetExportProfile(ctx context.Context, classroomID uint) (domain.ExportProfile, error) {
	var row models.Classroom
	var profile domain.ExportProfile
	if err := r.db.WithContext(ctx).Select("export_profile").First(&row, classroomID).Error; err != nil {
		return profile, dberror.Translate(err)
	}
	if err := json.Unmarshal([]byte(row.ExportProfile), &profile); err != nil {
		return profile, fmt.Errorf("classroom %d export profile: %w", classroomID, err)
	}
	return profile, nil
}

func (r *Repo) SaveExportProfile(ctx context.Context, classroomID, teacherID uint, profile domain.ExportProfile) error {
	data, err := json.Marshal(profile)
	if err != nil {
		return err
	}
	result := r.db.WithContext(ctx).Model(&models.Classroom{}).Where("id = ? AND teacher_id = ?", classroomID, teacherID).Update("export_profile", string(data))
	if result.Error != nil {
		return dberror.Translate(result.Error)
	}
	if result.RowsAffected == 0 {
		return repository.ErrNotFound
	}
	return nil
}
