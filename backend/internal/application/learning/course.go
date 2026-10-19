package learning

import (
	"context"
	"maps"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/google/uuid"
)

func (s *Service) LessonProgress(ctx context.Context, userID uint) ([]domain.LessonAttempt, error) {
	if userID == 0 || s.lessonRepo == nil {
		return nil, ErrInvalid
	}
	return s.lessonRepo.LatestLessonAttempts(ctx, userID, domain.CourseCatalog().Version)
}

func (s *Service) SubmitLesson(ctx context.Context, userID uint, id, lessonID, questionID, version string, answers map[string]string) (*domain.LessonAttempt, error) {
	parsed, err := uuid.Parse(id)
	lesson := domain.FindCourseLesson(lessonID)
	if err != nil || parsed == uuid.Nil || userID == 0 || lesson == nil || version != domain.CourseCatalog().Version || s.lessonRepo == nil {
		return nil, ErrInvalid
	}
	var question *domain.CourseQuestion
	for i := range lesson.Questions {
		if lesson.Questions[i].ID == questionID {
			question = &lesson.Questions[i]
			break
		}
	}
	if question == nil {
		return nil, ErrInvalid
	}
	results, score, valid := domain.GradeCourseQuestion(*question, answers)
	if !valid {
		return nil, ErrInvalid
	}
	input := domain.LessonAttempt{ID: parsed.String(), UserID: userID, Version: version, LessonID: lessonID, QuestionID: questionID, Stage: question.Stage,
		Answers: answers, Score: score, Total: len(results), Results: results, Explanation: question.Explanation, CreatedAt: s.now().UTC()}
	saved, err := s.lessonRepo.SaveLessonAttempt(ctx, input)
	if err != nil {
		return nil, err
	}
	if saved == nil {
		return nil, ErrInvalid
	}
	if saved.LessonID != input.LessonID || saved.QuestionID != input.QuestionID || saved.Version != version || !maps.Equal(saved.Answers, answers) {
		return nil, ErrConflict
	}
	return saved, nil
}
