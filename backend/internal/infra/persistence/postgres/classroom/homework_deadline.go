package classroom

import (
	"context"
	"encoding/json"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/dberror"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (r *Repo) ExtendHomeworkDeadline(ctx context.Context, id string, actor uint, studentID string, deadline time.Time, reason string) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var row models.ClassroomHomework
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("public_id = ? AND teacher_id = ?", id, actor).First(&row).Error; err != nil {
			return err
		}
		if row.Withdrawn || row.FeedbackAt != nil {
			return repository.ErrInvalidInput
		}
		item, err := homeworkFromRow(row)
		if err != nil {
			return err
		}
		change := domain.HomeworkDeadlineChange{ActorID: actor, PreviousDeadline: item.Deadline, Deadline: deadline.UTC(), Reason: reason, CreatedAt: time.Now().UTC()}
		if studentID != "" {
			var student models.User
			if err := tx.Where("public_id = ? AND role = ?", studentID, "student").First(&student).Error; err != nil {
				return err
			}
			var membership models.ClassroomStudent
			if err := tx.Where("classroom_id = ? AND student_id = ?", row.ClassroomID, student.ID).First(&membership).Error; err != nil {
				return err
			}
			if !item.AppliesTo(membership.CreatedAt) {
				return repository.ErrInvalidInput
			}
			var submitted int64
			if err := tx.Model(&models.ClassroomHomeworkSubmission{}).Where("homework_id = ? AND student_id = ?", row.ID, student.ID).Count(&submitted).Error; err != nil {
				return err
			}
			if submitted != 0 {
				return repository.ErrConflict
			}
			change.StudentID, change.StudentPublicID, change.StudentName = student.ID, student.PublicID, student.DisplayName
			if change.StudentName == "" {
				change.StudentName = student.Username
			}
			change.PreviousDeadline = item.StudentDeadline(student.ID)
		}
		if !deadline.After(change.PreviousDeadline) || !deadline.After(change.CreatedAt) || !deadline.After(item.StartsAt) {
			return repository.ErrInvalidInput
		}
		item.DeadlineChanges = append(item.DeadlineChanges, change)
		payload, err := json.Marshal(item.DeadlineChanges)
		if err != nil {
			return err
		}
		updates := map[string]any{"deadline_changes": string(payload)}
		if studentID == "" {
			updates["deadline"] = deadline.UTC()
		}
		return tx.Model(&row).Updates(updates).Error
	})
	return dberror.Translate(err)
}
