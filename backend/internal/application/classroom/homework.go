package classroom

import (
	"context"
	"errors"
	"strings"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
)

func (s *Service) HomeworkBank(ctx context.Context, actor uint, classroomID string) ([]domain.HomeworkPaper, error) {
	if _, err := s.owned(ctx, actor, classroomID); err != nil {
		return nil, err
	}
	return domain.HomeworkBank(), nil
}

func (s *Service) PublishHomework(ctx context.Context, actor uint, classroomID, bankID string, startsAt, deadline time.Time) (*domain.Homework, error) {
	classroom, err := s.owned(ctx, actor, classroomID)
	if err != nil {
		return nil, err
	}
	if startsAt.IsZero() || !deadline.After(startsAt) || !deadline.After(time.Now()) {
		return nil, ErrHomeworkInvalid
	}
	for _, paper := range domain.HomeworkBank() {
		if paper.ID == bankID {
			return s.repo.CreateHomework(ctx, domain.Homework{PublicID: strings.ReplaceAll(uuid.NewString(), "-", ""), ClassroomID: classroom.ID, TeacherID: actor, BankID: paper.ID, Title: paper.Title, Questions: paper.Questions, StartsAt: startsAt.UTC(), Deadline: deadline.UTC()})
		}
	}
	return nil, ErrHomeworkInvalid
}

func (s *Service) Homeworks(ctx context.Context, actor uint, classroomID string) ([]domain.Homework, error) {
	classroom, err := s.owned(ctx, actor, classroomID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListHomeworks(ctx, classroom.ID)
}

func (s *Service) homeworkStudent(ctx context.Context, actor uint) (*domain.Classroom, error) {
	user, err := s.actor(ctx, actor)
	if err != nil {
		return nil, err
	}
	if user.Role != domainuser.RoleStudent {
		return nil, ErrForbidden
	}
	classroom, err := s.repo.GetStudentClassroom(ctx, actor)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotInClassroom
	}
	return classroom, err
}

type StudentHomework struct {
	Homework   domain.Homework
	Submission *domain.HomeworkSubmission
	Makeup     bool
}

func (s *Service) StudentHomeworks(ctx context.Context, actor uint) (*domain.Classroom, []StudentHomework, error) {
	classroom, err := s.homeworkStudent(ctx, actor)
	if err != nil {
		return nil, nil, err
	}
	items, err := s.repo.ListHomeworks(ctx, classroom.ID)
	if err != nil {
		return nil, nil, err
	}
	roster, err := s.repo.ListClassroomStudents(ctx, classroom.ID)
	if err != nil {
		return nil, nil, err
	}
	var joinedAt time.Time
	for _, student := range roster {
		if student.ID == actor {
			joinedAt = student.JoinedAt
			break
		}
	}
	views := make([]StudentHomework, 0, len(items))
	for _, item := range items {
		subs, err := s.repo.ListHomeworkSubmissions(ctx, item.ID, actor)
		if err != nil {
			return nil, nil, err
		}
		if len(subs) == 0 && !item.AppliesTo(joinedAt) {
			continue
		}
		item.Questions = studentHomeworkQuestions(item)
		view := StudentHomework{Homework: item}
		view.Homework.Deadline = item.StudentDeadline(actor)
		view.Makeup = view.Homework.Deadline.After(item.Deadline)
		if len(subs) > 0 {
			view.Submission = &subs[0]
		}
		views = append(views, view)
	}
	return classroom, views, nil
}

// Redact answer keys before crossing the application boundary. The HTTP view
// additionally hides scheduled questions using the response's single timestamp.
func studentHomeworkQuestions(item domain.Homework) []domain.HomeworkQuestion {
	questions := make([]domain.HomeworkQuestion, len(item.Questions))
	for i, q := range item.Questions {
		questions[i] = q
		// Keep the blank count without keeping any answer text.
		questions[i].Accepted = make([][]string, len(q.Accepted))
	}
	return questions
}

func (s *Service) studentHomework(ctx context.Context, actor uint, id string) (*domain.Homework, error) {
	classroom, err := s.homeworkStudent(ctx, actor)
	if err != nil {
		return nil, err
	}
	item, err := s.repo.GetHomework(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrHomeworkNotFound
	}
	if err != nil {
		return nil, err
	}
	if item.ClassroomID != classroom.ID {
		return nil, ErrHomeworkNotFound
	}
	return item, nil
}

func (s *Service) SubmitHomework(ctx context.Context, actor uint, id string, answers [][]string) (*domain.HomeworkSubmission, error) {
	item, err := s.studentHomework(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	if now.Before(item.StartsAt) || !now.Before(item.StudentDeadline(actor)) {
		return nil, ErrHomeworkWindow
	}
	results, score, valid := domain.GradeHomework(item.Questions, answers)
	if !valid {
		return nil, ErrHomeworkAnswers
	}
	sub := domain.HomeworkSubmission{HomeworkID: item.ID, StudentID: actor, Answers: answers, Results: results, Score: score}
	err = s.repo.CreateHomeworkSubmission(ctx, sub)
	switch {
	case errors.Is(err, repository.ErrConflict), errors.Is(err, repository.ErrDuplicate):
		return nil, ErrHomeworkSubmitted
	case errors.Is(err, repository.ErrInvalidInput):
		return nil, ErrHomeworkWindow
	case errors.Is(err, repository.ErrNotFound):
		return nil, ErrHomeworkNotFound
	case err != nil:
		return nil, err
	}
	subs, err := s.repo.ListHomeworkSubmissions(ctx, item.ID, actor)
	if err != nil {
		return nil, err
	}
	return &subs[0], nil
}

type HomeworkReport struct {
	Homework    domain.Homework
	Students    []domain.Student
	Submissions []domain.HomeworkSubmission
}

func (s *Service) HomeworkReport(ctx context.Context, actor uint, id string) (*HomeworkReport, error) {
	if err := s.teacher(ctx, actor); err != nil {
		return nil, err
	}
	item, err := s.repo.GetHomework(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrHomeworkNotFound
	}
	if err != nil {
		return nil, err
	}
	if item.TeacherID != actor {
		return nil, ErrHomeworkNotFound
	}
	students, err := s.repo.ListClassroomStudents(ctx, item.ClassroomID)
	if err != nil {
		return nil, err
	}
	subs, err := s.repo.ListHomeworkSubmissions(ctx, item.ID, 0)
	if err != nil {
		return nil, err
	}
	item.SubmissionCount = int64(len(subs))
	submitted := map[uint]bool{}
	for _, sub := range subs {
		submitted[sub.StudentID] = true
	}
	eligible := students[:0]
	for _, student := range students {
		if item.AppliesTo(student.JoinedAt) || submitted[student.ID] {
			eligible = append(eligible, student)
		}
	}
	return &HomeworkReport{Homework: *item, Students: eligible, Submissions: subs}, nil
}
