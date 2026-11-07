package analytics

import (
	"context"
	"encoding/json"
	"fmt"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/analytics"
	classroom "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	lab "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	learning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"gorm.io/gorm"
	"time"
)

const studentCountSQL = "(SELECT COUNT(*) FROM classroom_students m JOIN identity_users u ON u.id = m.student_id AND u.deleted_at IS NULL AND u.role = 'student' WHERE m.classroom_id = c.id)"
const currentStudentsSQL = "JOIN identity_users u ON u.id = m.student_id AND u.deleted_at IS NULL AND u.role = 'student'"

func (r *Repo) timestampSQL(column string) string {
	if r.db.Dialector.Name() == "sqlite" {
		return "julianday(" + column + ")"
	}
	return column
}

// Actual submissions remain evidence after re-enrollment; otherwise the task
// must still have been available when the student joined the current roster.
func (r *Repo) assessmentStudentsSQL(end, evidence string) string {
	return "(SELECT COUNT(*) FROM classroom_students m JOIN identity_users u ON u.id = m.student_id AND u.deleted_at IS NULL AND u.role = 'student' WHERE m.classroom_id = c.id AND (" + end + " IS NULL OR " + r.timestampSQL("m.created_at") + " < " + r.timestampSQL(end) + " OR EXISTS (" + evidence + ")))"
}

// SQLite stores timestamps as text; normalize offsets for existing assignments.
func (r *Repo) started(query *gorm.DB, column string) *gorm.DB {
	if r.db.Dialector.Name() == "sqlite" {
		return query.Where("julianday("+column+") <= julianday(?)", time.Now().UTC())
	}
	return query.Where(column+" <= ?", time.Now().UTC())
}

type assessmentRow struct {
	ID, ClassroomID, ClassroomName, ItemKey, Title string
	Expected                                       int64
}

func assessmentRows(rows []assessmentRow) []domain.Assessment {
	items := make([]domain.Assessment, 0, len(rows))
	for _, row := range rows {
		items = append(items, domain.Assessment{ID: row.ID, ClassroomID: row.ClassroomID, ClassroomName: row.ClassroomName, ItemKey: row.ItemKey, Title: row.Title, Expected: row.Expected})
	}
	return items
}

// Completion denominators use the current student roster for each assignment.
// Assessment results are cumulative; the visit date selector does not hide older assignments.
func (r *Repo) homeworkStats(ctx context.Context, f domain.Filter) ([]domain.Assessment, error) {
	var assignments []assessmentRow
	query := r.db.WithContext(ctx).Table("classroom_homeworks h").Joins("JOIN classrooms c ON c.id = h.classroom_id").Where("c.id IN (?)", r.classes(ctx, f))
	query = r.started(query, "h.starts_at")
	count := r.assessmentStudentsSQL("h.deadline", "SELECT 1 FROM classroom_homework_submissions e WHERE e.homework_id = h.id AND e.student_id = m.student_id")
	if err := query.Select("h.public_id AS id, c.public_id AS classroom_id, c.name AS classroom_name, h.bank_id AS item_key, h.title, " + count + " AS expected").Order("c.id, h.id").Scan(&assignments).Error; err != nil {
		return nil, err
	}
	items := assessmentRows(assignments)
	byID := make(map[string]*domain.Assessment)
	for i := range items {
		byID[items[i].ID] = &items[i]
	}
	submissions := r.db.WithContext(ctx).Table("classroom_homework_submissions s").Select("h.public_id AS id, s.score").Joins("JOIN classroom_homeworks h ON h.id = s.homework_id").Joins("JOIN classroom_students m ON m.classroom_id = h.classroom_id AND m.student_id = s.student_id").Joins(currentStudentsSQL).Where("h.classroom_id IN (?)", r.classes(ctx, f))
	rows, err := r.started(submissions, "h.starts_at").Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var row struct {
			ID    string
			Score float64
		}
		if err := r.db.ScanRows(rows, &row); err != nil {
			return nil, err
		}
		if item := byID[row.ID]; item != nil {
			item.Started++
			item.AddScore(row.Score)
		}
	}
	return items, rows.Err()
}

func (r *Repo) labStats(ctx context.Context, f domain.Filter) ([]domain.Assessment, error) {
	var assignments []assessmentRow
	query := r.db.WithContext(ctx).Table("classroom_lab_assessments a").Joins("JOIN classrooms c ON c.public_id = a.classroom_id").Where("c.id IN (?)", r.classes(ctx, f))
	query = r.started(query, "a.starts_at")
	end := "CASE WHEN a.open = false AND a.closed_at IS NOT NULL AND (a.deadline IS NULL OR " + r.timestampSQL("a.closed_at") + " < " + r.timestampSQL("a.deadline") + ") THEN a.closed_at ELSE a.deadline END"
	count := r.assessmentStudentsSQL(end, "SELECT 1 FROM classroom_lab_assessment_states e WHERE e.assignment_id = a.id AND e.user_id = m.student_id")
	if err := query.Select("a.id, c.public_id AS classroom_id, c.name AS classroom_name, a.course_id AS item_key, a.course_id AS title, " + count + " AS expected").Order("c.id, a.course_id").Scan(&assignments).Error; err != nil {
		return nil, err
	}
	items := assessmentRows(assignments)
	byID := make(map[string]*domain.Assessment)
	for i := range items {
		byID[items[i].ID] = &items[i]
	}
	states := r.db.WithContext(ctx).Table("classroom_lab_assessment_states s").Select("s.assignment_id, s.user_id, s.payload, a.course_id").Joins("JOIN classroom_lab_assessments a ON a.id = s.assignment_id").Joins("JOIN classrooms c ON c.public_id = a.classroom_id").Joins("JOIN classroom_students m ON m.classroom_id = c.id AND m.student_id = s.user_id").Joins(currentStudentsSQL).Where("c.id IN (?)", r.classes(ctx, f))
	rows, err := r.started(states, "a.starts_at").Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var row struct {
			AssignmentID, Payload, CourseID string
			UserID                          uint
		}
		if err := r.db.ScanRows(rows, &row); err != nil {
			return nil, err
		}
		var state lab.State
		if err := json.Unmarshal([]byte(row.Payload), &state); err != nil {
			return nil, fmt.Errorf("analytics lab %s user %d: %w", row.AssignmentID, row.UserID, err)
		}
		if item := byID[row.AssignmentID]; item != nil {
			if len(state.Tasks) > 0 {
				item.Started++
			}
			if score, complete := domain.LabCompletion(state, row.CourseID); complete {
				item.AddScore(score)
			}
		}
	}
	return items, rows.Err()
}

func (r *Repo) lessonStats(ctx context.Context, f domain.Filter) ([]domain.LessonStats, error) {
	var quizzes []struct {
		ID                                      uint
		PublicID, Title, ClassroomID, Questions string
		Students                                int64
	}
	query := r.db.WithContext(ctx).Table("classroom_quizzes q").Joins("JOIN classrooms c ON c.id = q.classroom_id").Where("c.id IN (?) AND q.phase = ? AND q.status IN ?", r.classes(ctx, f), classroom.QuizPhasePreClass, []string{classroom.QuizStatusOpen, classroom.QuizStatusClosed})
	if err := query.Select("q.id, q.public_id, q.title, c.public_id AS classroom_id, q.questions, " + studentCountSQL + " AS students").Order("c.id, q.id").Scan(&quizzes).Error; err != nil {
		return nil, err
	}
	items := []domain.LessonStats{}
	questions := make(map[uint][]classroom.QuizQuestion)
	indexes := make(map[uint][]int)
	for _, quiz := range quizzes {
		var qs []classroom.QuizQuestion
		if err := json.Unmarshal([]byte(quiz.Questions), &qs); err != nil {
			return nil, fmt.Errorf("analytics quiz %s: %w", quiz.PublicID, err)
		}
		questions[quiz.ID] = qs
		lessonIndexes := make(map[string]int)
		for _, q := range qs {
			key := q.LessonID
			if key == "" {
				key = "unassigned"
			}
			index, exists := lessonIndexes[key]
			if !exists {
				index = len(items)
				lessonIndexes[key] = index
				item := domain.LessonStats{QuizID: quiz.PublicID, QuizTitle: quiz.Title, ClassroomID: quiz.ClassroomID, LessonID: key, Title: q.ConceptTitle}
				if lesson := learning.FindCourseLesson(q.LessonID); lesson != nil {
					item.Number = lesson.Number
					item.Title = lesson.Title
				}
				items = append(items, item)
			}
			items[index].Expected += quiz.Students
			indexes[quiz.ID] = append(indexes[quiz.ID], index)
		}
	}
	rows, err := r.db.WithContext(ctx).Table("classroom_quiz_submissions s").Select("s.quiz_id, s.student_id, s.answers").Joins("JOIN classroom_quizzes q ON q.id = s.quiz_id").Joins("JOIN classroom_students m ON m.classroom_id = q.classroom_id AND m.student_id = s.student_id").Joins(currentStudentsSQL).Where("q.classroom_id IN (?) AND q.phase = ? AND q.status IN ?", r.classes(ctx, f), classroom.QuizPhasePreClass, []string{classroom.QuizStatusOpen, classroom.QuizStatusClosed}).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var row struct {
			QuizID, StudentID uint
			Answers           string
		}
		if err := r.db.ScanRows(rows, &row); err != nil {
			return nil, err
		}
		var answers []int
		if err := json.Unmarshal([]byte(row.Answers), &answers); err != nil {
			return nil, fmt.Errorf("analytics quiz %d student %d: %w", row.QuizID, row.StudentID, err)
		}
		for i, q := range questions[row.QuizID] {
			if i >= len(answers) || answers[i] < 0 || answers[i] >= len(q.Options) {
				continue
			}
			item := &items[indexes[row.QuizID][i]]
			item.Answered++
			if answers[i] == q.Answer {
				item.Correct++
			}
		}
	}
	return items, rows.Err()
}
