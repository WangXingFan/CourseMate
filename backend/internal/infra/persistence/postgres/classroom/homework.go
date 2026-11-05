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
		if now.Before(homework.StartsAt) || !now.Before(homework.Deadline) {
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
