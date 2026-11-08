package learning

import (
	"context"
	"maps"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/google/uuid"
)

func (s *Service) PracticeBank(ctx context.Context, userID uint, conceptID, locale string) (*domain.PracticeBank, []domain.LessonAttempt, error) {
	bank := domain.FindPracticeBank(conceptID, locale)
	if userID == 0 || bank == nil || s.lessonRepo == nil {
		return nil, nil, ErrInvalid
	}
	all, err := s.lessonRepo.LatestLessonAttempts(ctx, userID, domain.PracticeBankVersion)
	if err != nil {
		return nil, nil, err
	}
	attempts := []domain.LessonAttempt{}
	for _, item := range all {
		if item.ConceptID == conceptID {
			attempts = append(attempts, item)
		}
	}
	return bank, attempts, nil
}

func (s *Service) SubmitPractice(ctx context.Context, userID uint, id, conceptID, questionID, locale string, answers map[string]string) (*domain.LessonAttempt, error) {
	parsed, err := uuid.Parse(id)
	bank := domain.FindPracticeBank(conceptID, locale)
	if err != nil || parsed == uuid.Nil || userID == 0 || bank == nil || s.lessonRepo == nil {
		return nil, ErrInvalid
	}
	var question *domain.PracticeQuestion
	for i := range bank.Questions {
		if bank.Questions[i].ID == questionID {
			question = &bank.Questions[i]
			break
		}
	}
	if question == nil {
		return nil, ErrInvalid
	}
	results, score, valid := domain.GradeCourseQuestion(question.CourseQuestion, answers)
	if !valid {
		return nil, ErrInvalid
	}
	input := domain.LessonAttempt{ID: parsed.String(), UserID: userID, Version: domain.PracticeBankVersion, ConceptID: conceptID, LessonID: bank.Concept.LessonID,
		QuestionID: questionID, Stage: "practice", Answers: answers, Score: score, Total: len(results), Results: results, Explanation: question.Explanation, CreatedAt: s.now().UTC()}
	saved, err := s.lessonRepo.SaveLessonAttempt(ctx, input)
	if err != nil {
		return nil, err
	}
	if saved == nil {
		return nil, ErrInvalid
	}
	if saved.Version != input.Version || saved.ConceptID != conceptID || saved.QuestionID != questionID || !maps.Equal(saved.Answers, answers) {
		return nil, ErrConflict
	}
	return saved, nil
}
