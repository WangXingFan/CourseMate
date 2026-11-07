package classroom

import (
	"context"
	"encoding/json"
	"fmt"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/dberror"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
)

func (r *Repo) SaveGradeRecord(ctx context.Context, item domain.GradeRecord) error {
	data, err := json.Marshal(item.Report)
	if err != nil {
		return err
	}
	return dberror.Translate(r.db.WithContext(ctx).Create(&models.ClassroomGradeRecord{ID: item.ID, ClassroomID: item.ClassroomID, TeacherID: item.TeacherID, Title: item.Title, CreatedAt: item.CreatedAt, Report: string(data), Workbook: item.Workbook}).Error)
}

func (r *Repo) ListGradeRecords(ctx context.Context, classroomID uint) ([]domain.GradeRecord, error) {
	items := []domain.GradeRecord{}
	rows := []models.ClassroomGradeRecord{}
	err := r.db.WithContext(ctx).Select("id, classroom_id, teacher_id, title, created_at").Where("classroom_id = ?", classroomID).Order("created_at DESC, id DESC").Find(&rows).Error
	for _, row := range rows {
		items = append(items, domain.GradeRecord{ID: row.ID, ClassroomID: row.ClassroomID, TeacherID: row.TeacherID, Title: row.Title, CreatedAt: row.CreatedAt})
	}
	return items, dberror.Translate(err)
}

func (r *Repo) GetGradeRecord(ctx context.Context, classroomID uint, id string) (*domain.GradeRecord, error) {
	var row models.ClassroomGradeRecord
	if err := r.db.WithContext(ctx).Where("classroom_id = ? AND id = ?", classroomID, id).First(&row).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	item := &domain.GradeRecord{ID: row.ID, ClassroomID: row.ClassroomID, TeacherID: row.TeacherID, Title: row.Title, CreatedAt: row.CreatedAt, Workbook: row.Workbook}
	if err := json.Unmarshal([]byte(row.Report), &item.Report); err != nil {
		return nil, fmt.Errorf("grade record %s: %w", row.ID, err)
	}
	return item, nil
}
