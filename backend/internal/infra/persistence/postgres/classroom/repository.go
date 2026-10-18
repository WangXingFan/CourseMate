package classroom

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/dberror"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repo struct {
	db *gorm.DB
}

func NewRepo(db *gorm.DB) *Repo {
	return &Repo{db: db}
}

func (r *Repo) classroomQuery(ctx context.Context) *gorm.DB {
	return r.db.WithContext(ctx).
		Table("classrooms AS classrooms").
		Select(`
			classrooms.id,
			classrooms.public_id,
			classrooms.teacher_id,
			COALESCE(NULLIF(users.display_name, ''), users.username, '') AS teacher_name,
			classrooms.name,
			classrooms.description,
			(
				SELECT COUNT(*)
				FROM classroom_students AS members
				JOIN identity_users AS students
					ON students.id = members.student_id
					AND students.deleted_at IS NULL
					AND students.role = 'student'
				WHERE members.classroom_id = classrooms.id
			) AS student_count,
			classrooms.created_at
		`).
		Joins("LEFT JOIN identity_users AS users ON users.id = classrooms.teacher_id AND users.deleted_at IS NULL")
}

func (r *Repo) ListClassrooms(ctx context.Context, actorID uint, ownedOnly bool) ([]domain.Classroom, error) {
	if actorID == 0 {
		return nil, repository.ErrInvalidInput
	}
	query := r.classroomQuery(ctx)
	if ownedOnly {
		query = query.Where("classrooms.teacher_id = ?", actorID)
	}
	items := make([]domain.Classroom, 0)
	if err := query.Order("classrooms.created_at DESC, classrooms.id DESC").Scan(&items).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	return items, nil
}

func (r *Repo) CreateClassroom(ctx context.Context, input domain.Classroom) (*domain.Classroom, error) {
	if input.PublicID == "" || input.TeacherID == 0 || strings.TrimSpace(input.Name) == "" {
		return nil, repository.ErrInvalidInput
	}
	record := models.Classroom{
		PublicID:    input.PublicID,
		TeacherID:   input.TeacherID,
		Name:        input.Name,
		Description: input.Description,
	}
	if err := r.db.WithContext(ctx).Create(&record).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	item, err := r.GetOwnedClassroom(ctx, record.PublicID, record.TeacherID)
	if err != nil {
		return nil, err
	}
	return item, nil
}

func (r *Repo) GetClassroom(ctx context.Context, publicID string) (*domain.Classroom, error) {
	return r.findClassroom(ctx, publicID, nil)
}

func (r *Repo) GetOwnedClassroom(ctx context.Context, publicID string, teacherID uint) (*domain.Classroom, error) {
	if teacherID == 0 {
		return nil, repository.ErrInvalidInput
	}
	return r.findClassroom(ctx, publicID, &teacherID)
}

func (r *Repo) findClassroom(ctx context.Context, publicID string, teacherID *uint) (*domain.Classroom, error) {
	publicID = strings.TrimSpace(publicID)
	if publicID == "" {
		return nil, repository.ErrNotFound
	}
	query := r.classroomQuery(ctx).Where("classrooms.public_id = ?", publicID)
	if teacherID != nil {
		query = query.Where("classrooms.teacher_id = ?", *teacherID)
	}
	var item domain.Classroom
	if err := query.Limit(1).Scan(&item).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	if item.ID == 0 {
		return nil, repository.ErrNotFound
	}
	return &item, nil
}

func (r *Repo) UpdateClassroom(ctx context.Context, publicID string, teacherID uint, name, description string) error {
	if publicID == "" || teacherID == 0 {
		return repository.ErrInvalidInput
	}
	result := r.db.WithContext(ctx).
		Model(&models.Classroom{}).
		Where("public_id = ? AND teacher_id = ?", publicID, teacherID).
		Updates(map[string]any{"name": name, "description": description})
	if result.Error != nil {
		return dberror.Translate(result.Error)
	}
	if result.RowsAffected == 0 {
		return repository.ErrNotFound
	}
	return nil
}

func (r *Repo) DeleteClassroom(ctx context.Context, publicID string, teacherID uint) error {
	if publicID == "" || teacherID == 0 {
		return repository.ErrInvalidInput
	}
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var item models.Classroom
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("public_id = ? AND teacher_id = ?", publicID, teacherID).
			First(&item).Error; err != nil {
			return err
		}
		if err := tx.Where("classroom_id = ?", item.ID).Delete(&models.ClassroomStudent{}).Error; err != nil {
			return err
		}
		quizIDs := make([]uint, 0)
		if err := tx.Model(&models.ClassroomQuiz{}).
			Where("classroom_id = ?", item.ID).
			Pluck("id", &quizIDs).Error; err != nil {
			return err
		}
		if len(quizIDs) > 0 {
			if err := tx.Where("quiz_id IN ?", quizIDs).Delete(&models.ClassroomQuizSubmission{}).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("classroom_id = ?", item.ID).Delete(&models.ClassroomQuiz{}).Error; err != nil {
			return err
		}
		result := tx.Delete(&item)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return repository.ErrNotFound
		}
		return nil
	})
	return dberror.Translate(err)
}

func (r *Repo) GetStudentClassroom(ctx context.Context, studentID uint) (*domain.Classroom, error) {
	if studentID == 0 {
		return nil, repository.ErrInvalidInput
	}
	var publicID string
	err := r.db.WithContext(ctx).
		Table("classroom_students AS membership").
		Select("classrooms.public_id").
		Joins("JOIN classrooms ON classrooms.id = membership.classroom_id AND classrooms.deleted_at IS NULL").
		Where("membership.student_id = ?", studentID).
		Limit(1).
		Scan(&publicID).Error
	if err != nil {
		return nil, dberror.Translate(err)
	}
	if publicID == "" {
		return nil, repository.ErrNotFound
	}
	return r.GetClassroom(ctx, publicID)
}

func (r *Repo) CreateQuiz(ctx context.Context, input domain.Quiz) (*domain.Quiz, error) {
	if input.PublicID == "" || input.ClassroomID == 0 || input.TeacherID == 0 || len(input.Questions) == 0 {
		return nil, repository.ErrInvalidInput
	}
	encoded, err := json.Marshal(input.Questions)
	if err != nil {
		return nil, err
	}
	record := models.ClassroomQuiz{
		PublicID:    input.PublicID,
		ClassroomID: input.ClassroomID,
		TeacherID:   input.TeacherID,
		Title:       input.Title,
		Phase:       input.Phase,
		Status:      input.Status,
		Questions:   string(encoded),
	}
	if err := r.db.WithContext(ctx).Create(&record).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	return r.GetOwnedQuiz(ctx, record.PublicID, record.TeacherID)
}

func (r *Repo) ListQuizzes(ctx context.Context, classroomID uint) ([]domain.Quiz, error) {
	if classroomID == 0 {
		return nil, repository.ErrInvalidInput
	}
	records := make([]models.ClassroomQuiz, 0)
	if err := r.db.WithContext(ctx).
		Where("classroom_id = ?", classroomID).
		Order("created_at DESC, id DESC").
		Find(&records).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	counts, err := r.submissionCounts(ctx, records)
	if err != nil {
		return nil, err
	}
	items := make([]domain.Quiz, 0, len(records))
	for _, record := range records {
		item, err := toDomainQuiz(record, counts[record.ID])
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	return items, nil
}

func (r *Repo) submissionCounts(ctx context.Context, records []models.ClassroomQuiz) (map[uint]int64, error) {
	counts := make(map[uint]int64, len(records))
	if len(records) == 0 {
		return counts, nil
	}
	ids := make([]uint, 0, len(records))
	for _, record := range records {
		ids = append(ids, record.ID)
	}
	rows := make([]struct {
		QuizID uint  `gorm:"column:quiz_id"`
		Total  int64 `gorm:"column:total"`
	}, 0)
	if err := r.db.WithContext(ctx).
		Model(&models.ClassroomQuizSubmission{}).
		Select("quiz_id, COUNT(*) AS total").
		Where("quiz_id IN ?", ids).
		Group("quiz_id").
		Scan(&rows).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	for _, row := range rows {
		counts[row.QuizID] = row.Total
	}
	return counts, nil
}

func (r *Repo) GetQuiz(ctx context.Context, publicID string) (*domain.Quiz, error) {
	return r.findQuiz(ctx, publicID, nil)
}

func (r *Repo) GetOwnedQuiz(ctx context.Context, publicID string, teacherID uint) (*domain.Quiz, error) {
	if teacherID == 0 {
		return nil, repository.ErrInvalidInput
	}
	return r.findQuiz(ctx, publicID, &teacherID)
}

func (r *Repo) findQuiz(ctx context.Context, publicID string, teacherID *uint) (*domain.Quiz, error) {
	publicID = strings.TrimSpace(publicID)
	if publicID == "" {
		return nil, repository.ErrNotFound
	}
	query := r.db.WithContext(ctx).Where("public_id = ?", publicID)
	if teacherID != nil {
		query = query.Where("teacher_id = ?", *teacherID)
	}
	var record models.ClassroomQuiz
	if err := query.First(&record).Error; err != nil {
		if dberror.IsRecordNotFound(err) {
			return nil, repository.ErrNotFound
		}
		return nil, dberror.Translate(err)
	}
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.ClassroomQuizSubmission{}).
		Where("quiz_id = ?", record.ID).
		Count(&count).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	return toDomainQuiz(record, count)
}

func (r *Repo) UpdateQuizStatus(ctx context.Context, publicID string, teacherID uint, status string) error {
	if publicID == "" || teacherID == 0 || status == "" {
		return repository.ErrInvalidInput
	}
	updates := map[string]any{"status": status}
	now := time.Now()
	switch status {
	case domain.QuizStatusOpen:
		updates["opened_at"] = now
		updates["closed_at"] = nil
	case domain.QuizStatusClosed:
		updates["closed_at"] = now
	}
	result := r.db.WithContext(ctx).
		Model(&models.ClassroomQuiz{}).
		Where("public_id = ? AND teacher_id = ?", publicID, teacherID).
		Updates(updates)
	if result.Error != nil {
		return dberror.Translate(result.Error)
	}
	if result.RowsAffected == 0 {
		return repository.ErrNotFound
	}
	return nil
}

func (r *Repo) ListStudentQuizzes(ctx context.Context, classroomID, studentID uint) ([]domain.Quiz, error) {
	if classroomID == 0 || studentID == 0 {
		return nil, repository.ErrInvalidInput
	}
	records := make([]models.ClassroomQuiz, 0)
	if err := r.db.WithContext(ctx).
		Where("classroom_id = ? AND status IN ?", classroomID, []string{domain.QuizStatusOpen, domain.QuizStatusClosed}).
		Order("opened_at DESC, id DESC").
		Find(&records).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	submissions := make([]models.ClassroomQuizSubmission, 0)
	if len(records) > 0 {
		ids := make([]uint, 0, len(records))
		for _, record := range records {
			ids = append(ids, record.ID)
		}
		if err := r.db.WithContext(ctx).
			Where("student_id = ? AND quiz_id IN ?", studentID, ids).
			Find(&submissions).Error; err != nil {
			return nil, dberror.Translate(err)
		}
	}
	byQuiz := make(map[uint]models.ClassroomQuizSubmission, len(submissions))
	for _, submission := range submissions {
		byQuiz[submission.QuizID] = submission
	}
	items := make([]domain.Quiz, 0, len(records))
	for _, record := range records {
		item, err := toDomainQuiz(record, 0)
		if err != nil {
			return nil, err
		}
		if submission, ok := byQuiz[record.ID]; ok {
			answers := make([]int, 0)
			if err := json.Unmarshal([]byte(submission.Answers), &answers); err != nil {
				return nil, err
			}
			item.Submitted = true
			item.Score = submission.Score
			item.Answers = answers
		}
		items = append(items, *item)
	}
	return items, nil
}

func (r *Repo) CreateQuizSubmission(ctx context.Context, input domain.QuizSubmission) error {
	if input.QuizID == 0 || input.StudentID == 0 {
		return repository.ErrInvalidInput
	}
	encoded, err := json.Marshal(input.Answers)
	if err != nil {
		return err
	}
	record := models.ClassroomQuizSubmission{
		QuizID:    input.QuizID,
		StudentID: input.StudentID,
		Answers:   string(encoded),
		Score:     input.Score,
	}
	if err := r.db.WithContext(ctx).Create(&record).Error; err != nil {
		if dberror.IsUniqueConstraint(err) {
			return repository.ErrConflict
		}
		return dberror.Translate(err)
	}
	return nil
}

type quizSubmissionRow struct {
	ID              uint      `gorm:"column:id"`
	QuizID          uint      `gorm:"column:quiz_id"`
	StudentID       uint      `gorm:"column:student_id"`
	StudentPublicID string    `gorm:"column:student_public_id"`
	StudentName     string    `gorm:"column:student_name"`
	Username        string    `gorm:"column:username"`
	Answers         string    `gorm:"column:answers"`
	Score           int       `gorm:"column:score"`
	SubmittedAt     time.Time `gorm:"column:submitted_at"`
}

func (r *Repo) ListQuizSubmissions(ctx context.Context, quizID uint) ([]domain.QuizSubmission, error) {
	if quizID == 0 {
		return nil, repository.ErrInvalidInput
	}
	rows := make([]quizSubmissionRow, 0)
	err := r.db.WithContext(ctx).
		Table("classroom_quiz_submissions AS submissions").
		Select(`submissions.id, submissions.quiz_id, submissions.student_id,
			users.public_id AS student_public_id,
			COALESCE(NULLIF(users.display_name, ''), users.username) AS student_name,
			users.username, submissions.answers, submissions.score,
			submissions.created_at AS submitted_at`).
		Joins("JOIN identity_users AS users ON users.id = submissions.student_id AND users.deleted_at IS NULL").
		Where("submissions.quiz_id = ?", quizID).
		Order("submissions.created_at ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, dberror.Translate(err)
	}
	items := make([]domain.QuizSubmission, 0, len(rows))
	for _, row := range rows {
		answers := make([]int, 0)
		if err := json.Unmarshal([]byte(row.Answers), &answers); err != nil {
			return nil, err
		}
		items = append(items, domain.QuizSubmission{
			ID:              row.ID,
			QuizID:          row.QuizID,
			StudentID:       row.StudentID,
			StudentPublicID: row.StudentPublicID,
			StudentName:     row.StudentName,
			Username:        row.Username,
			Answers:         answers,
			Score:           row.Score,
			SubmittedAt:     row.SubmittedAt,
		})
	}
	return items, nil
}

func toDomainQuiz(record models.ClassroomQuiz, submissionCount int64) (*domain.Quiz, error) {
	questions := make([]domain.QuizQuestion, 0)
	if err := json.Unmarshal([]byte(record.Questions), &questions); err != nil {
		return nil, err
	}
	return &domain.Quiz{
		ID:              record.ID,
		PublicID:        record.PublicID,
		ClassroomID:     record.ClassroomID,
		TeacherID:       record.TeacherID,
		Title:           record.Title,
		Phase:           record.Phase,
		Status:          record.Status,
		Questions:       questions,
		CreatedAt:       record.CreatedAt,
		OpenedAt:        record.OpenedAt,
		ClosedAt:        record.ClosedAt,
		SubmissionCount: submissionCount,
	}, nil
}

func (r *Repo) ListClassroomStudents(ctx context.Context, classroomID uint) ([]domain.Student, error) {
	if classroomID == 0 {
		return nil, repository.ErrInvalidInput
	}
	items := make([]domain.Student, 0)
	err := r.db.WithContext(ctx).
		Table("classroom_students AS members").
		Select("users.public_id, users.username, COALESCE(NULLIF(users.display_name, ''), users.username) AS display_name").
		Joins("JOIN identity_users AS users ON users.id = members.student_id AND users.deleted_at IS NULL").
		Where("members.classroom_id = ? AND users.role = ?", classroomID, domainuser.RoleStudent).
		Order("users.username ASC").
		Scan(&items).Error
	if err != nil {
		return nil, dberror.Translate(err)
	}
	return items, nil
}

func (r *Repo) AddClassroomStudent(ctx context.Context, classroomID, teacherID uint, username string) error {
	if classroomID == 0 || teacherID == 0 || username == "" {
		return repository.ErrInvalidInput
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var classroom models.Classroom
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND teacher_id = ?", classroomID, teacherID).
			First(&classroom).Error; err != nil {
			if dberror.IsRecordNotFound(err) {
				return repository.ErrNotFound
			}
			return err
		}
		var student models.User
		if err := tx.Where("username = ? AND role = ?", username, domainuser.RoleStudent).
			First(&student).Error; err != nil {
			if dberror.IsRecordNotFound(err) {
				return repository.ErrInvalidInput
			}
			return err
		}
		var count int64
		if err := tx.Model(&models.ClassroomStudent{}).
			Where("student_id = ?", student.ID).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return repository.ErrConflict
		}
		if err := tx.Create(&models.ClassroomStudent{
			StudentID:   student.ID,
			ClassroomID: classroomID,
		}).Error; err != nil {
			if dberror.IsUniqueConstraint(err) {
				return repository.ErrConflict
			}
			return err
		}
		return nil
	})
}

func (r *Repo) RemoveClassroomStudent(ctx context.Context, classroomID, teacherID uint, studentPublicID string) error {
	if classroomID == 0 || teacherID == 0 || studentPublicID == "" {
		return repository.ErrInvalidInput
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var classroom models.Classroom
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND teacher_id = ?", classroomID, teacherID).
			First(&classroom).Error; err != nil {
			if dberror.IsRecordNotFound(err) {
				return repository.ErrNotFound
			}
			return err
		}
		var student models.User
		if err := tx.Where("public_id = ? AND role = ?", studentPublicID, domainuser.RoleStudent).
			First(&student).Error; err != nil {
			if dberror.IsRecordNotFound(err) {
				return repository.ErrNotFound
			}
			return err
		}
		result := tx.Where("classroom_id = ? AND student_id = ?", classroomID, student.ID).
			Delete(&models.ClassroomStudent{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return repository.ErrNotFound
		}
		return nil
	})
}
