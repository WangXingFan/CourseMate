package classroom

import (
	"context"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	learning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/google/uuid"
	"strings"
)

func (s *Service) RemediationBank(ctx context.Context, actor uint, classroomID, conceptID string) (*learning.PracticeBank, error) {
	if _, err := s.owned(ctx, actor, classroomID); err != nil {
		return nil, err
	}
	bank := learning.FindPracticeBank(conceptID, "zh-CN")
	if bank == nil {
		return nil, ErrQuizInvalid
	}
	return bank, nil
}

func (s *Service) CreateRemediation(ctx context.Context, actor uint, classroomID, title, conceptID string, questionIDs, studentIDs []string) (*domain.Quiz, error) {
	class, err := s.owned(ctx, actor, classroomID)
	if err != nil {
		return nil, err
	}
	bank, err := s.RemediationBank(ctx, actor, classroomID, conceptID)
	if err != nil {
		return nil, err
	}
	if len(questionIDs) == 0 || len(questionIDs) > 10 || strings.TrimSpace(title) == "" || len([]rune(title)) > 120 {
		return nil, ErrQuizInvalid
	}
	targets, err := s.remediationTargets(ctx, class.ID, studentIDs)
	if err != nil {
		return nil, err
	}
	questions := []domain.QuizQuestion{}
	seen := map[string]bool{}
	for _, id := range questionIDs {
		found := false
		for _, q := range bank.Questions {
			if q.ID != id {
				continue
			}
			if seen[id] {
				return nil, ErrQuizInvalid
			}
			seen[id], found = true, true
			question := domain.QuizQuestion{ID: q.ID, LessonID: bank.Concept.LessonID, ConceptID: conceptID, ConceptTitle: bank.Concept.Title, Prompt: q.Prompt, Options: q.Options, Answer: q.Answer, Explanation: q.Explanation, Formula: q.Formula}
			for _, field := range q.Fields {
				question.Fields = append(question.Fields, domain.QuizField{ID: field.ID, Label: field.Label, Unit: field.Unit, Expected: field.Expected})
			}
			questions = append(questions, question)
		}
		if !found {
			return nil, ErrQuizInvalid
		}
	}
	return s.repo.CreateQuiz(ctx, domain.Quiz{PublicID: strings.ReplaceAll(uuid.NewString(), "-", ""), ClassroomID: class.ID, TeacherID: actor, Title: strings.TrimSpace(title), Purpose: "remediation", Phase: domain.QuizPhaseAfterClass, Status: domain.QuizStatusDraft, Questions: questions, TargetStudentIDs: targets})
}

func (s *Service) remediationTargets(ctx context.Context, classroomID uint, studentIDs []string) ([]uint, error) {
	if len(studentIDs) == 0 || len(studentIDs) > 500 {
		return nil, ErrQuizInvalid
	}
	roster, err := s.repo.ListClassroomStudents(ctx, classroomID)
	if err != nil {
		return nil, err
	}
	byID := map[string]uint{}
	for _, student := range roster {
		byID[student.PublicID] = student.ID
	}
	ids, seen := []uint{}, map[string]bool{}
	for _, id := range studentIDs {
		if byID[id] == 0 || seen[id] {
			return nil, ErrQuizInvalid
		}
		ids = append(ids, byID[id])
		seen[id] = true
	}
	return ids, nil
}

func (s *Service) CopyQuiz(ctx context.Context, actor uint, id, classroomID, title string, students []string) (*domain.Quiz, error) {
	quiz, err := s.ownedQuiz(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	class, err := s.owned(ctx, actor, classroomID)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(title) == "" || len([]rune(title)) > 120 {
		return nil, ErrQuizInvalid
	}
	targets := []uint{}
	if quiz.Purpose == "remediation" {
		targets, err = s.remediationTargets(ctx, class.ID, students)
		if err != nil {
			return nil, err
		}
	}
	return s.repo.CreateQuiz(ctx, domain.Quiz{PublicID: strings.ReplaceAll(uuid.NewString(), "-", ""), ClassroomID: class.ID, TeacherID: actor, Title: strings.TrimSpace(title), Purpose: quiz.Purpose, Phase: quiz.Phase, Status: domain.QuizStatusDraft, Questions: quiz.Questions, TargetStudentIDs: targets})
}
