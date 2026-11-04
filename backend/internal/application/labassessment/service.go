package labassessment

import (
	"context"
	"crypto/rand"
	"errors"
	"math"
	"math/big"
	"reflect"
	"strings"
	"time"

	class "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	user "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
)

type userReader interface {
	GetByID(context.Context, uint) (*user.User, error)
}
type Service struct {
	repo    repository.LabAssessmentRepository
	classes repository.ClassroomRepository
	users   userReader
	now     func() time.Time
}

func NewService(repo repository.LabAssessmentRepository, classes repository.ClassroomRepository, users userReader) *Service {
	return &Service{repo: repo, classes: classes, users: users, now: time.Now}
}
func (s *Service) role(ctx context.Context, id uint, role string) error {
	u, err := s.users.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if id == 0 || u == nil || u.Role != role {
		return domain.ErrForbidden
	}
	return nil
}
func (s *Service) owned(ctx context.Context, actor uint, id string) (*class.Classroom, error) {
	if err := s.role(ctx, actor, user.RoleTeacher); err != nil {
		return nil, err
	}
	c, err := s.classes.GetOwnedClassroom(ctx, id, actor)
	if errors.Is(err, repository.ErrNotFound) {
		err = domain.ErrNotFound
	}
	return c, err
}
func (s *Service) studentClass(ctx context.Context, actor uint) (*class.Classroom, error) {
	if err := s.role(ctx, actor, user.RoleStudent); err != nil {
		return nil, err
	}
	c, err := s.classes.GetStudentClassroom(ctx, actor)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, domain.ErrForbidden
	}
	return c, err
}
func (s *Service) student(ctx context.Context, actor uint, id string) (domain.Assignment, *class.Classroom, error) {
	a, err := s.repo.Get(ctx, id)
	if err != nil {
		return a, nil, err
	}
	c, err := s.studentClass(ctx, actor)
	if err != nil {
		return a, nil, err
	}
	if c == nil || c.PublicID != a.ClassroomID {
		return a, nil, domain.ErrForbidden
	}
	return a, c, nil
}
func (s *Service) teacher(ctx context.Context, actor uint, id string) (domain.Assignment, error) {
	a, err := s.repo.Get(ctx, id)
	if err != nil {
		return a, err
	}
	_, err = s.owned(ctx, actor, a.ClassroomID)
	return a, err
}
func (s *Service) List(ctx context.Context, actor uint, classID string) ([]domain.Assignment, error) {
	if _, err := s.owned(ctx, actor, classID); err != nil {
		return nil, err
	}
	return s.repo.List(ctx, classID)
}
func (s *Service) StudentList(ctx context.Context, actor uint) ([]domain.Assignment, error) {
	c, err := s.studentClass(ctx, actor)
	if err != nil {
		return nil, err
	}
	return s.repo.List(ctx, c.PublicID)
}
func (s *Service) Publish(ctx context.Context, actor uint, classID, course string, start time.Time, deadline *time.Time) (domain.Assignment, error) {
	a := domain.Assignment{}
	if _, err := s.owned(ctx, actor, classID); err != nil {
		return a, err
	}
	now := s.now().UTC()
	if start.IsZero() {
		start = now
	}
	if len(domain.TaskIDs(course)) == 0 || deadline != nil && (!deadline.After(start) || !deadline.After(now)) {
		return a, domain.ErrInvalid
	}
	a = domain.Assignment{ID: uuid.NewString(), ClassroomID: classID, CourseID: course, Version: domain.Version, TeacherID: actor, Open: true, StartsAt: start, Deadline: deadline, CreatedAt: now}
	return a, s.repo.Create(ctx, a)
}
func (s *Service) SetOpen(ctx context.Context, actor uint, id string, open bool) error {
	if _, err := s.teacher(ctx, actor, id); err != nil {
		return err
	}
	return s.repo.SetOpen(ctx, id, open)
}
func validTask(a domain.Assignment, task string) bool {
	for _, id := range domain.TaskIDs(a.CourseID) {
		if task == id {
			return true
		}
	}
	return false
}
func classOpen(c *class.Classroom, course string) bool {
	switch course {
	case "L1":
		return c.Lab1Open
	case "L2":
		return c.Lab2Open
	case "L3":
		return c.Lab3Open
	}
	return false
}
func (s *Service) Read(ctx context.Context, actor uint, id string) (domain.Assignment, domain.State, error) {
	a, _, err := s.student(ctx, actor, id)
	if err != nil {
		return a, domain.State{}, err
	}
	// Viewing answers after closure permanently forfeits remaining attempts, even
	// if the teacher later reopens the publication.
	if a.Final(s.now()) {
		state, err := s.repo.Mutate(ctx, id, actor, func(current domain.Assignment, state *domain.State) error {
			a = current
			if current.Final(s.now()) {
				for _, t := range state.Tasks {
					if len(t.Attempts) > 0 {
						t.Explained = true
					}
				}
			}
			return nil
		})
		return a, state, err
	}
	state, err := s.repo.ReadState(ctx, id, actor)
	return a, state, err
}
func (s *Service) mutate(ctx context.Context, actor uint, id, task string, fn func(*domain.TaskState) error) (domain.State, error) {
	a, c, err := s.student(ctx, actor, id)
	if err != nil {
		return domain.State{}, err
	}
	if !validTask(a, task) {
		return domain.State{}, domain.ErrInvalid
	}
	if !classOpen(c, a.CourseID) {
		return domain.State{}, domain.ErrClosed
	}
	return s.repo.Mutate(ctx, id, actor, func(current domain.Assignment, state *domain.State) error {
		if !current.Active(s.now()) {
			return domain.ErrClosed
		}
		return fn(state.Task(task))
	})
}
func (s *Service) Start(ctx context.Context, actor uint, id, task string) (domain.State, error) {
	return s.mutate(ctx, actor, id, task, func(t *domain.TaskState) error {
		if t.Explained {
			return domain.ErrLimit
		}
		for _, a := range t.Attempts {
			if a.SubmittedAt == nil {
				return nil
			}
		}
		if len(t.Attempts) >= 2 {
			return domain.ErrLimit
		}
		seed, err := rand.Int(rand.Reader, big.NewInt(64))
		if err != nil {
			return err
		}
		v := int(seed.Int64())
		var paper domain.Paper
		for i := 0; i < 64; i++ {
			paper, err = domain.PaperFor(task, (v+i)%64)
			if err != nil {
				return err
			}
			if len(t.Attempts) == 0 {
				break
			}
			previous := t.Attempts[0].Paper
			if previous.Variant%2 != paper.Variant%2 && !reflect.DeepEqual(previous.Parameters, paper.Parameters) {
				break
			}
			if i == 63 {
				return domain.ErrConflict
			}
		}
		t.Attempts = append(t.Attempts, domain.Attempt{ID: uuid.NewString(), Paper: paper, StartedAt: s.now().UTC()})
		return nil
	})
}
func (s *Service) Submit(ctx context.Context, actor uint, id, task, attempt, requestID string, answers map[string]string, confirmBlank bool) (domain.State, error) {
	if _, err := uuid.Parse(requestID); err != nil {
		return domain.State{}, domain.ErrInvalid
	}
	// An exact retry remains idempotent even after the deadline or a closure.
	a, _, err := s.student(ctx, actor, id)
	if err != nil {
		return domain.State{}, err
	}
	if !validTask(a, task) {
		return domain.State{}, domain.ErrInvalid
	}
	return s.repo.Mutate(ctx, id, actor, func(current domain.Assignment, state *domain.State) error {
		t := state.Task(task)
		for i := range t.Attempts {
			at := &t.Attempts[i]
			if at.ID != attempt {
				continue
			}
			if at.SubmittedAt != nil {
				if at.RequestID == requestID && reflect.DeepEqual(at.Answers, answers) {
					return nil
				}
				return domain.ErrConflict
			}
			c, err := s.studentClass(ctx, actor)
			if err != nil {
				return err
			}
			if !current.Active(s.now()) || !classOpen(c, current.CourseID) {
				return domain.ErrClosed
			}
			if t.Explained {
				return domain.ErrLimit
			}
			for _, f := range at.Paper.Fields {
				if strings.TrimSpace(answers[f.ID]) == "" && !confirmBlank {
					return domain.ErrInvalid
				}
			}
			result, err := domain.Grade(at.Paper, answers)
			if err != nil {
				return err
			}
			now := s.now().UTC()
			at.SubmittedAt = &now
			at.RequestID = requestID
			at.Answers = answers
			at.Result = &result
			return nil
		}
		return domain.ErrNotFound
	})
}
func (s *Service) Checkpoint(ctx context.Context, actor uint, id, task, key string, answers map[string]string) (domain.State, error) {
	if key != "O1" && key != "O2" {
		return domain.State{}, domain.ErrInvalid
	}
	return s.mutate(ctx, actor, id, task, func(t *domain.TaskState) error {
		index := 0
		if key == "O2" {
			index = 1
		}
		point := domain.Checkpoints(task)[index]
		result, err := domain.Grade(point.Paper, answers)
		if err != nil {
			return err
		}
		passed := true
		for _, f := range result.Fields {
			passed = passed && f.Correct
		}
		if !t.Checkpoints[key].Passed {
			t.Checkpoints[key] = domain.CheckpointResult{Passed: passed, At: s.now().UTC(), Answers: answers, Result: result}
		}
		return nil
	})
}
func (s *Service) Explain(ctx context.Context, actor uint, id, task string) (domain.State, error) {
	a, _, err := s.student(ctx, actor, id)
	if err != nil {
		return domain.State{}, err
	}
	if !validTask(a, task) {
		return domain.State{}, domain.ErrInvalid
	}
	return s.repo.Mutate(ctx, id, actor, func(_ domain.Assignment, state *domain.State) error {
		t := state.Task(task)
		if len(t.Attempts) == 0 {
			return domain.ErrInvalid
		}
		for _, a := range t.Attempts {
			if a.SubmittedAt == nil {
				return domain.ErrInvalid
			}
		}
		t.Explained = true
		return nil
	})
}

type Report struct {
	Assignment domain.Assignment
	Students   []class.Student
	States     []domain.State
}

func (s *Service) Report(ctx context.Context, actor uint, id string) (Report, error) {
	a, err := s.teacher(ctx, actor, id)
	r := Report{Assignment: a}
	if err != nil {
		return r, err
	}
	c, err := s.classes.GetClassroom(ctx, a.ClassroomID)
	if err != nil {
		return r, err
	}
	r.Students, err = s.classes.ListClassroomStudents(ctx, c.ID)
	if err != nil {
		return r, err
	}
	r.States, err = s.repo.States(ctx, id)
	return r, err
}
func (s *Service) Preview(ctx context.Context, actor uint, id, task string) (domain.Paper, error) {
	a, err := s.teacher(ctx, actor, id)
	if err != nil {
		return domain.Paper{}, err
	}
	if !validTask(a, task) {
		return domain.Paper{}, domain.ErrInvalid
	}
	return domain.PaperFor(task, 0)
}
func (s *Service) Correct(ctx context.Context, actor uint, id, studentID, task string, score float64, reason string) error {
	r, err := s.Report(ctx, actor, id)
	if err != nil {
		return err
	}
	reason = strings.TrimSpace(reason)
	if !validTask(r.Assignment, task) || math.IsNaN(score) || math.IsInf(score, 0) || score < 0 || score > 25 || reason == "" || len(reason) > 2000 {
		return domain.ErrInvalid
	}
	var target uint
	for _, u := range r.Students {
		if u.PublicID == studentID {
			target = u.ID
		}
	}
	if target == 0 {
		return domain.ErrNotFound
	}
	_, err = s.repo.Mutate(ctx, id, target, func(_ domain.Assignment, state *domain.State) error {
		t := state.Task(task)
		correction := domain.Correction{Score: score, Reason: reason, TeacherID: actor, At: s.now().UTC()}
		t.Correction = &correction
		t.Corrections = append(t.Corrections, correction)
		return nil
	})
	return err
}
