package repository

import (
	"context"
	"time"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
)

type LearningQuizRepository interface {
	StartQuizRound(context.Context, learning.QuizRound) (*learning.QuizRound, error)
	AnswerQuizRound(context.Context, uint, string, string, int, time.Time) (*learning.QuizRound, error)
	FinishQuizRound(context.Context, uint, string, time.Time) (*learning.QuizRound, error)
	QuizLeaderboard(context.Context, uint, string) ([]learning.QuizRanking, error)
}
