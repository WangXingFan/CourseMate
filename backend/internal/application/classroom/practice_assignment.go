package classroom

import (
	"context"
	"errors"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	learning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
	"reflect"
	"strings"
	"time"
	"unicode/utf8"
)

func (s *Service) PracticeCandidates(ctx context.Context, actor uint, classroomID, conceptID, locale string) (*learning.PracticeBank, error) {
	if _, err := s.owned(ctx, actor, classroomID); err != nil {
		return nil, err
	}
	bank := learning.FindPracticeBank(conceptID, locale)
	if bank == nil {
		return nil, ErrPracticeInvalid
	}
	return bank, nil
}

func (s *Service) PublishPractice(ctx context.Context, actor uint, classroomID, conceptID, title, locale string, questionIDs, studentIDs []string, deadline time.Time) (*domain.PracticeAssignment, error) {
	class, err := s.owned(ctx, actor, classroomID)
	if err != nil {
		return nil, err
	}
	bank := learning.FindPracticeBank(conceptID, locale)
	title = strings.TrimSpace(title)
	if bank == nil || title == "" || utf8.RuneCountInString(title) > 120 || len(questionIDs) < 3 || len(questionIDs) > 5 || len(studentIDs) == 0 || len(studentIDs) > 200 || !deadline.After(time.Now()) {
		return nil, ErrPracticeInvalid
	}
	item := domain.PracticeAssignment{PublicID: strings.ReplaceAll(uuid.NewString(), "-", ""), ClassroomID: class.ID, TeacherID: actor, ConceptID: conceptID, LessonID: bank.Concept.LessonID, Title: title, Deadline: deadline.UTC(), CreatedAt: time.Now().UTC()}
	seen := map[string]bool{}
	for _, id := range questionIDs {
		if seen[id] {
			return nil, ErrPracticeInvalid
		}
		seen[id] = true
		for _, question := range bank.Questions {
			if question.ID == id {
				item.Questions = append(item.Questions, question)
				break
			}
		}
	}
	if len(item.Questions) != len(questionIDs) {
		return nil, ErrPracticeInvalid
	}
	roster, err := s.repo.ListClassroomStudents(ctx, class.ID)
	if err != nil {
		return nil, err
	}
	seen = map[string]bool{}
	ids := []uint{}
	for _, id := range studentIDs {
		if seen[id] {
			return nil, ErrPracticeInvalid
		}
		seen[id] = true
		for _, student := range roster {
			if student.PublicID == id {
				name := student.DisplayName
				if name == "" {
					name = student.Username
				}
				item.Recipients = append(item.Recipients, domain.PracticeRecipient{StudentID: student.ID, PublicID: id, Name: name, BaselineStatus: "unassessed"})
				ids = append(ids, student.ID)
				break
			}
		}
	}
	if len(ids) != len(studentIDs) {
		return nil, ErrPracticeInvalid
	}
	if s.mastery == nil {
		return nil, errors.New("mastery reader not configured")
	}
	profiles, err := s.mastery.MasteryProfiles(ctx, ids, class.ID, learning.MasteryPeriod{})
	if err != nil {
		return nil, err
	}
	for i, student := range item.Recipients {
		for _, concept := range profiles[student.StudentID].Concepts {
			if concept.ID == conceptID {
				item.Recipients[i].BaselineStatus = concept.Status
				break
			}
		}
	}
	return s.repo.CreatePracticeAssignment(ctx, item)
}

type PracticeAssignmentView struct {
	Assignment  domain.PracticeAssignment
	Submissions []domain.PracticeSubmission
}

func (s *Service) PracticeAssignments(ctx context.Context, actor uint, classroomID string) ([]PracticeAssignmentView, error) {
	class, err := s.owned(ctx, actor, classroomID)
	if err != nil {
		return nil, err
	}
	return s.practiceAssignments(ctx, class.ID, 0)
}

func (s *Service) StudentPracticeAssignments(ctx context.Context, actor uint) ([]PracticeAssignmentView, error) {
	class, err := s.homeworkStudent(ctx, actor)
	if err != nil {
		return nil, err
	}
	return s.practiceAssignments(ctx, class.ID, actor)
}

func (s *Service) practiceAssignments(ctx context.Context, classroomID, studentID uint) ([]PracticeAssignmentView, error) {
	items, err := s.repo.ListPracticeAssignments(ctx, classroomID)
	if err != nil {
		return nil, err
	}
	views := make([]PracticeAssignmentView, 0, len(items))
	for _, item := range items {
		if studentID != 0 && !item.Includes(studentID) {
			continue
		}
		subs, err := s.repo.ListPracticeSubmissions(ctx, item.ID, studentID)
		if err != nil {
			return nil, err
		}
		if studentID != 0 {
			item.Recipients = nil
			for i := range item.Questions {
				item.Questions[i].Answer = 0
				item.Questions[i].Explanation = ""
				for j := range item.Questions[i].Fields {
					item.Questions[i].Fields[j].Expected = 0
				}
			}
		}
		views = append(views, PracticeAssignmentView{Assignment: item, Submissions: subs})
	}
	return views, nil
}

func (s *Service) SubmitAssignedPractice(ctx context.Context, actor uint, id string, answers map[string]map[string]string) (*domain.PracticeSubmission, error) {
	class, err := s.homeworkStudent(ctx, actor)
	if err != nil {
		return nil, err
	}
	item, err := s.repo.GetPracticeAssignment(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrPracticeNotFound
	}
	if err != nil {
		return nil, err
	}
	if item.ClassroomID != class.ID || !item.Includes(actor) {
		return nil, ErrPracticeNotFound
	}
	// A retry returns the saved result, including after the deadline.
	existing, err := s.repo.ListPracticeSubmissions(ctx, item.ID, actor)
	if err != nil {
		return nil, err
	}
	if len(existing) > 0 {
		return savedPracticeSubmission(existing[0], answers)
	}
	if !time.Now().Before(item.Deadline) {
		return nil, ErrPracticeClosed
	}
	if len(answers) != len(item.Questions) {
		return nil, ErrPracticeInvalid
	}
	sub := domain.PracticeSubmission{AssignmentID: item.ID, StudentID: actor}
	for _, q := range item.Questions {
		results, score, valid := learning.GradeCourseQuestion(q.CourseQuestion, answers[q.ID])
		if !valid {
			return nil, ErrPracticeInvalid
		}
		if score == len(results) {
			sub.Correct++
		}
		sub.Attempts = append(sub.Attempts, learning.LessonAttempt{ID: uuid.NewString(), UserID: actor, Version: learning.PracticeBankVersion, ConceptID: item.ConceptID, LessonID: item.LessonID, QuestionID: q.ID, Stage: "practice", Answers: answers[q.ID], Score: score, Total: len(results), Results: results, Explanation: q.Explanation})
	}
	err = s.repo.CreatePracticeSubmission(ctx, sub)
	if errors.Is(err, repository.ErrInvalidInput) {
		return nil, ErrPracticeClosed
	}
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrPracticeNotFound
	}
	if err != nil && !errors.Is(err, repository.ErrDuplicate) {
		return nil, err
	}
	saved, err := s.repo.ListPracticeSubmissions(ctx, item.ID, actor)
	if err != nil {
		return nil, err
	}
	if len(saved) == 0 {
		return nil, errors.New("practice submission missing after save")
	}
	return savedPracticeSubmission(saved[0], answers)
}

func savedPracticeSubmission(sub domain.PracticeSubmission, answers map[string]map[string]string) (*domain.PracticeSubmission, error) {
	saved := map[string]map[string]string{}
	for _, attempt := range sub.Attempts {
		saved[attempt.QuestionID] = attempt.Answers
	}
	if !reflect.DeepEqual(saved, answers) {
		return nil, ErrPracticeSubmitted
	}
	return &sub, nil
}
