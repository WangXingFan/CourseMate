package learning

import (
	"context"
	"crypto/rand"
	"errors"
	"math/big"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
)

func (s *Service) quizRepository() (repository.LearningQuizRepository, error) {
	r, ok := s.repo.(repository.LearningQuizRepository)
	if !ok {
		return nil, ErrInvalid
	}
	return r, nil
}

func (s *Service) StartQuiz(ctx context.Context, user uint, id, chapter string) (*domain.QuizRound, error) {
	parsed, err := uuid.Parse(id)
	c := domain.FindQuizChapter(chapter)
	if err != nil || parsed == uuid.Nil || user == 0 || c == nil {
		return nil, ErrInvalid
	}
	r, err := s.quizRepository()
	if err != nil {
		return nil, err
	}
	questions := append([]string{}, c.QuestionIDs...)
	for i := len(questions) - 1; i > 0; i-- {
		n, e := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		if e != nil {
			return nil, e
		}
		j := int(n.Int64())
		questions[i], questions[j] = questions[j], questions[i]
	}
	questions = questions[:min(domain.QuizQuestionsPerRound, len(questions))]
	now := s.now().UTC()
	result, err := r.StartQuizRound(ctx, domain.QuizRound{ID: parsed.String(), UserID: user, ChapterID: chapter, BankVersion: domain.QuizBankVersion(), QuestionIDs: questions, Answers: []domain.QuizAnswer{}, StartedAt: now, DeadlineAt: now.Add(domain.QuizDuration)})
	return result, mapQuizError(err)
}

func (s *Service) AnswerQuiz(ctx context.Context, user uint, id, question string, selected int) (*domain.QuizRound, error) {
	if user == 0 || !validQuizID(id) || domain.FindQuestion(question) == nil || selected < 0 || selected > 3 {
		return nil, ErrInvalid
	}
	r, err := s.quizRepository()
	if err != nil {
		return nil, err
	}
	result, err := r.AnswerQuizRound(ctx, user, id, question, selected, s.now().UTC())
	return result, mapQuizError(err)
}

func (s *Service) FinishQuiz(ctx context.Context, user uint, id string) (*domain.QuizRound, error) {
	if user == 0 || !validQuizID(id) {
		return nil, ErrInvalid
	}
	r, err := s.quizRepository()
	if err != nil {
		return nil, err
	}
	result, err := r.FinishQuizRound(ctx, user, id, s.now().UTC())
	return result, mapQuizError(err)
}

func (s *Service) QuizLeaderboard(ctx context.Context, user uint, chapter string) ([]domain.QuizRanking, error) {
	if user == 0 || domain.FindQuizChapter(chapter) == nil {
		return nil, ErrInvalid
	}
	r, err := s.quizRepository()
	if err != nil {
		return nil, err
	}
	return r.QuizLeaderboard(ctx, user, chapter)
}
func validQuizID(id string) bool {
	parsed, err := uuid.Parse(id)
	return err == nil && parsed != uuid.Nil && parsed.String() == id
}
func mapQuizError(err error) error {
	if errors.Is(err, repository.ErrConflict) {
		return ErrConflict
	}
	if errors.Is(err, repository.ErrInvalidInput) || errors.Is(err, repository.ErrNotFound) {
		return ErrInvalid
	}
	return err
}
