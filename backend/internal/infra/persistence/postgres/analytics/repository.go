package analytics

import (
	"context"
	"fmt"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/analytics"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repo struct{ db *gorm.DB }

func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }

func (r *Repo) RecordVisit(ctx context.Context, visit domain.Visit) error {
	var membership models.ClassroomStudent
	if err := r.db.WithContext(ctx).Where("student_id = ?", visit.UserID).Limit(1).Find(&membership).Error; err != nil {
		return err
	}
	row := models.UsageVisit{EventID: visit.EventID, UserID: visit.UserID, ClassroomID: membership.ClassroomID, Resource: visit.Resource, CreatedAt: visit.CreatedAt}
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "event_id"}, {Name: "user_id"}}, DoNothing: true}).Create(&row).Error
}

func (r *Repo) Classrooms(ctx context.Context, teacher uint) ([]domain.Classroom, error) {
	items := make([]domain.Classroom, 0)
	query := r.db.WithContext(ctx).Model(&models.Classroom{}).Select("classrooms.id, classrooms.public_id, classrooms.name, (SELECT COUNT(*) FROM classroom_students s WHERE s.classroom_id = classrooms.id) AS students")
	if teacher != 0 {
		query = query.Where("teacher_id = ?", teacher)
	}
	err := query.Order("classrooms.id DESC").Scan(&items).Error
	return items, err
}

func (r *Repo) classes(ctx context.Context, f domain.Filter) *gorm.DB {
	query := r.db.WithContext(ctx).Model(&models.Classroom{}).Select("id")
	if f.TeacherID != 0 {
		query = query.Where("teacher_id = ?", f.TeacherID)
	}
	if f.ClassroomID != 0 {
		query = query.Where("id = ?", f.ClassroomID)
	}
	return query
}

func (r *Repo) visits(ctx context.Context, f domain.Filter, inRange bool) *gorm.DB {
	query := r.db.WithContext(ctx).Model(&models.UsageVisit{})
	if f.TeacherID != 0 || f.ClassroomID != 0 {
		query = query.Where("classroom_id IN (?)", r.classes(ctx, f))
	}
	if inRange {
		query = query.Where("created_at >= ? AND created_at < ?", f.From, f.Until)
	}
	return query
}

func (r *Repo) users(ctx context.Context, f domain.Filter, query *gorm.DB, column string) *gorm.DB {
	if f.TeacherID == 0 && f.ClassroomID == 0 {
		return query
	}
	members := r.db.WithContext(ctx).Model(&models.ClassroomStudent{}).Select("student_id").Where("classroom_id IN (?)", r.classes(ctx, f))
	return query.Where(column+" IN (?)", members)
}

func (r *Repo) period(query *gorm.DB, column string, f domain.Filter) *gorm.DB {
	if r.db.Dialector.Name() == "sqlite" {
		return query.Where("julianday("+column+") >= julianday(?) AND julianday("+column+") < julianday(?)", f.From, f.Until)
	}
	return query.Where(column+" >= ? AND "+column+" < ?", f.From, f.Until)
}

func (r *Repo) Report(ctx context.Context, f domain.Filter) (*domain.Report, error) {
	result := &domain.Report{Daily: []domain.Daily{}, Resources: []domain.ResourceUsage{}, Classrooms: []domain.Classroom{}}
	if err := r.visits(ctx, f, true).Select("COUNT(*) AS visits").Scan(&result.Summary).Error; err != nil {
		return nil, fmt.Errorf("usage totals: %w", err)
	}
	users := r.db.WithContext(ctx).Model(&models.User{})
	if err := r.users(ctx, f, users, "id").Count(&result.Summary.Users).Error; err != nil {
		return nil, err
	}
	var first models.UsageVisit
	if err := r.visits(ctx, f, false).Order("created_at ASC").Limit(1).Find(&first).Error; err != nil {
		return nil, err
	}
	if first.ID != 0 {
		result.FirstVisitAt = &first.CreatedAt
	}
	dateSQL := "to_char(created_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD')"
	if r.db.Dialector.Name() == "sqlite" {
		dateSQL = "strftime('%Y-%m-%d', created_at, '+8 hours')"
	}
	if err := r.visits(ctx, f, true).Select(dateSQL + " AS date, COUNT(*) AS visits").Group(dateSQL).Order("date").Scan(&result.Daily).Error; err != nil {
		return nil, fmt.Errorf("usage daily: %w", err)
	}
	if err := r.visits(ctx, f, true).Select("resource, COUNT(*) AS visits").Group("resource").Order("visits DESC, resource ASC").Scan(&result.Resources).Error; err != nil {
		return nil, fmt.Errorf("usage resources: %w", err)
	}
	if err := r.visits(ctx, f, true).Select("classroom_id AS id, COUNT(*) AS visits").Where("classroom_id <> 0").Group("classroom_id").Scan(&result.Classrooms).Error; err != nil {
		return nil, err
	}
	// Existing learning records contribute real usage before visit tracking was installed.
	for _, model := range []any{&models.LearningAttempt{}, &models.LearningLessonAttempt{}} {
		var count int64
		query := r.period(r.db.WithContext(ctx).Model(model), "created_at", f)
		if err := r.users(ctx, f, query, "user_id").Count(&count).Error; err != nil {
			return nil, fmt.Errorf("usage practice: %w", err)
		}
		result.Summary.PracticeAnswers += count
	}
	homework := r.period(r.db.WithContext(ctx).Table("classroom_homework_submissions s").Joins("JOIN classroom_homeworks h ON h.id = s.homework_id"), "s.created_at", f)
	if f.TeacherID != 0 || f.ClassroomID != 0 {
		homework = homework.Where("h.classroom_id IN (?)", r.classes(ctx, f))
	}
	if err := homework.Count(&result.Summary.HomeworkSubmissions).Error; err != nil {
		return nil, fmt.Errorf("usage homework: %w", err)
	}
	quiz := r.period(r.db.WithContext(ctx).Table("classroom_quiz_submissions s").Joins("JOIN classroom_quizzes q ON q.id = s.quiz_id"), "s.created_at", f)
	if f.TeacherID != 0 || f.ClassroomID != 0 {
		quiz = quiz.Where("q.classroom_id IN (?)", r.classes(ctx, f))
	}
	if err := quiz.Count(&result.Summary.QuizSubmissions).Error; err != nil {
		return nil, fmt.Errorf("usage quizzes: %w", err)
	}
	var err error
	result.Homeworks, err = r.homeworkStats(ctx, f)
	if err != nil {
		return nil, err
	}
	result.Labs, err = r.labStats(ctx, f)
	if err != nil {
		return nil, err
	}
	result.Lessons, err = r.lessonStats(ctx, f)
	if err != nil {
		return nil, err
	}
	return result, nil
}
