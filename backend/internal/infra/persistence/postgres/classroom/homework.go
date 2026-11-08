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

func (r *Repo) CreateHomework(ctx context.Context, input domain.Homework) (*domain.Homework, error) {
	questions, err := json.Marshal(input.Questions)
	if err != nil {
		return nil, err
	}
	row := models.ClassroomHomework{PublicID: input.PublicID, ClassroomID: input.ClassroomID, TeacherID: input.TeacherID, BankID: input.BankID, Title: input.Title, Questions: string(questions), StartsAt: input.StartsAt, Deadline: input.Deadline}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	input.ID, input.CreatedAt = row.ID, row.CreatedAt
	return &input, nil
}

func homeworkFromRow(row models.ClassroomHomework) (domain.Homework, error) {
	item := domain.Homework{ID: row.ID, PublicID: row.PublicID, ClassroomID: row.ClassroomID, TeacherID: row.TeacherID, BankID: row.BankID, Title: row.Title, StartsAt: row.StartsAt, Deadline: row.Deadline, CreatedAt: row.CreatedAt}
	item.Withdrawn, item.FeedbackAt = row.Withdrawn, row.FeedbackAt
	if err := json.Unmarshal([]byte(row.Changes), &item.Changes); err != nil {
		return item, err
	}
	err := json.Unmarshal([]byte(row.Questions), &item.Questions)
	return item, err
}

func (r *Repo) GetHomework(ctx context.Context, id string) (*domain.Homework, error) {
	var row models.ClassroomHomework
	if err := r.db.WithContext(ctx).Where("public_id = ?", id).First(&row).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	item, err := homeworkFromRow(row)
	return &item, err
}

func (r *Repo) ListHomeworks(ctx context.Context, classroomID uint) ([]domain.Homework, error) {
	var rows []struct {
		models.ClassroomHomework
		SubmissionCount int64
	}
	err := r.db.WithContext(ctx).Model(&models.ClassroomHomework{}).
		Select("classroom_homeworks.*, (SELECT COUNT(*) FROM classroom_homework_submissions s WHERE s.homework_id = classroom_homeworks.id) AS submission_count").
		Where("classroom_id = ?", classroomID).Order("starts_at DESC, id DESC").Find(&rows).Error
	if err != nil {
		return nil, dberror.Translate(err)
	}
	items := make([]domain.Homework, 0, len(rows))
	for _, row := range rows {
		item, err := homeworkFromRow(row.ClassroomHomework)
		if err != nil {
			return nil, err
		}
		item.SubmissionCount = row.SubmissionCount
		items = append(items, item)
	}
	return items, nil
}

// studentID = 0 is the teacher's complete report, otherwise only that student's row.
func (r *Repo) ListHomeworkSubmissions(ctx context.Context, homeworkID, studentID uint) ([]domain.HomeworkSubmission, error) {
	var rows []struct {
		models.ClassroomHomeworkSubmission
		StudentPublicID string
		StudentName     string
		Username        string
	}
	query := r.db.WithContext(ctx).Table("classroom_homework_submissions AS s").
		Select("s.*, u.public_id AS student_public_id, COALESCE(NULLIF(u.display_name, ''), u.username) AS student_name, u.username").
		Joins("JOIN identity_users u ON u.id = s.student_id").Where("s.homework_id = ?", homeworkID)
	if studentID != 0 {
		query = query.Where("s.student_id = ?", studentID)
	}
	if err := query.Order("s.created_at ASC").Scan(&rows).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	items := make([]domain.HomeworkSubmission, 0, len(rows))
	for _, row := range rows {
		item := domain.HomeworkSubmission{ID: row.ID, HomeworkID: row.HomeworkID, StudentID: row.StudentID, StudentPublicID: row.StudentPublicID, StudentName: row.StudentName, Username: row.Username, Score: row.Score, SubmittedAt: row.CreatedAt}
		if err := json.Unmarshal([]byte(row.Answers), &item.Answers); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(row.Results), &item.Results); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(row.Corrections), &item.Corrections); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *Repo) CreateHomeworkSubmission(ctx context.Context, input domain.HomeworkSubmission) error {
	answers, err := json.Marshal(input.Answers)
	if err != nil {
		return err
	}
	results, err := json.Marshal(input.Results)
	if err != nil {
		return err
	}
	err = r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var homework models.ClassroomHomework
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&homework, input.HomeworkID).Error; err != nil {
			return err
		}
		now := time.Now().UTC()
		if homework.Withdrawn || homework.FeedbackAt != nil || now.Before(homework.StartsAt) || !now.Before(homework.Deadline) {
			return repository.ErrInvalidInput
		}
		var membership models.ClassroomStudent
		if err := tx.Where("classroom_id = ? AND student_id = ?", homework.ClassroomID, input.StudentID).First(&membership).Error; err != nil {
			return err
		}
		return tx.Create(&models.ClassroomHomeworkSubmission{HomeworkID: input.HomeworkID, StudentID: input.StudentID, Answers: string(answers), Results: string(results), Score: input.Score, CreatedAt: now}).Error
	})
	if dberror.IsUniqueConstraint(err) {
		return repository.ErrConflict
	}
	return dberror.Translate(err)
}

func (r *Repo) ManageHomework(ctx context.Context, id, actor uint, action string, deadline time.Time, reason string) error {
	return dberror.Translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var row models.ClassroomHomework
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND teacher_id = ?", id, actor).First(&row).Error; err != nil {
			return err
		}
		if row.Withdrawn {
			return repository.ErrInvalidInput
		}
		now := time.Now().UTC()
		updates := map[string]any{}
		switch action {
		case "extend":
			if row.FeedbackAt != nil || !deadline.After(row.Deadline) || !deadline.After(now) {
				return repository.ErrInvalidInput
			}
			updates["deadline"] = deadline
		case "withdraw":
			var count int64
			if err := tx.Model(&models.ClassroomHomeworkSubmission{}).Where("homework_id = ?", id).Count(&count).Error; err != nil {
				return err
			}
			if count != 0 || row.FeedbackAt != nil {
				return repository.ErrInvalidInput
			}
			updates["withdrawn"] = true
		case "release":
			if now.Before(row.Deadline) {
				return repository.ErrInvalidInput
			}
			if row.FeedbackAt != nil {
				return nil
			}
			updates["feedback_at"] = now
		default:
			return repository.ErrInvalidInput
		}
		var changes []domain.HomeworkChange
		if err := json.Unmarshal([]byte(row.Changes), &changes); err != nil {
			return err
		}
		changes = append(changes, domain.HomeworkChange{Action: action, Actor: actor, Reason: reason, At: now, PreviousDeadline: row.Deadline, Deadline: deadline})
		encoded, err := json.Marshal(changes)
		if err != nil {
			return err
		}
		updates["changes"] = string(encoded)
		return tx.Model(&row).Updates(updates).Error
	}))
}

func (r *Repo) CorrectHomework(ctx context.Context, id, actor uint, studentID string, score int, reason string) error {
	return dberror.Translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var homework models.ClassroomHomework
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND teacher_id = ?", id, actor).First(&homework).Error; err != nil {
			return err
		}
		var row models.ClassroomHomeworkSubmission
		user := tx.Model(&models.User{}).Select("id").Where("public_id = ?", studentID)
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("homework_id = ? AND student_id IN (?)", id, user).First(&row).Error; err != nil {
			return err
		}
		var corrections []domain.HomeworkCorrection
		if err := json.Unmarshal([]byte(row.Corrections), &corrections); err != nil {
			return err
		}
		corrections = append(corrections, domain.HomeworkCorrection{Before: row.Score, Score: score, Reason: reason, Actor: actor, At: time.Now().UTC()})
		encoded, err := json.Marshal(corrections)
		if err != nil {
			return err
		}
		return tx.Model(&row).Updates(map[string]any{"score": score, "corrections": string(encoded)}).Error
	}))
}
