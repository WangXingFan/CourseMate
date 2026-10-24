package learning

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (r *Repo) StartQuizRound(ctx context.Context, input domain.QuizRound) (*domain.QuizRound, error) {
	payload, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}
	record := models.LearningQuizRound{ID: input.ID, UserID: input.UserID, ChapterID: input.ChapterID, BankVersion: input.BankVersion, Payload: string(payload), StartedAt: input.StartedAt}
	if err = r.db.WithContext(ctx).Clauses(clause.OnConflict{DoNothing: true}).Create(&record).Error; err != nil {
		return nil, err
	}
	var saved models.LearningQuizRound
	if err = r.db.WithContext(ctx).Where("id = ? AND user_id = ?", input.ID, input.UserID).First(&saved).Error; err != nil {
		return nil, repository.ErrConflict
	}
	if saved.ChapterID != input.ChapterID {
		return nil, repository.ErrConflict
	}
	return decodeQuizRound(saved)
}

func decodeQuizRound(record models.LearningQuizRound) (*domain.QuizRound, error) {
	var round domain.QuizRound
	if err := json.Unmarshal([]byte(record.Payload), &round); err != nil {
		return nil, err
	}
	round.UserID = record.UserID
	return &round, nil
}

func (r *Repo) mutateQuiz(ctx context.Context, user uint, id string, mutate func(*gorm.DB, *domain.QuizRound) error) (*domain.QuizRound, error) {
	var result *domain.QuizRound
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var row models.LearningQuizRound
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND user_id = ?", id, user).First(&row).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return repository.ErrNotFound
			}
			return err
		}
		round, err := decodeQuizRound(row)
		if err != nil {
			return err
		}
		if err = mutate(tx, round); err != nil {
			return err
		}
		payload, err := json.Marshal(round)
		if err != nil {
			return err
		}
		// The condition also prevents lost updates on SQLite, which has no row locks.
		updated := tx.Model(&models.LearningQuizRound{}).Where("id = ? AND payload = ?", id, row.Payload).Updates(map[string]any{"payload": string(payload), "score": round.Score, "answer_count": len(round.Answers), "elapsed_ms": round.ElapsedMS, "finished_at": round.FinishedAt})
		if updated.Error != nil {
			return updated.Error
		}
		if updated.RowsAffected != 1 {
			return repository.ErrConflict
		}
		result = round
		return nil
	})
	return result, err
}

func (r *Repo) AnswerQuizRound(ctx context.Context, user uint, id, question string, selected int, now time.Time) (*domain.QuizRound, error) {
	return r.mutateQuiz(ctx, user, id, func(tx *gorm.DB, round *domain.QuizRound) error {
		for _, answer := range round.Answers {
			if answer.QuestionID == question {
				if answer.Selected != selected {
					return repository.ErrConflict
				}
				return nil
			}
		}
		if round.FinishedAt != nil {
			return repository.ErrConflict
		}
		if !now.Before(round.DeadlineAt) {
			round.Finish(now)
			return nil
		}
		if len(round.Answers) >= len(round.QuestionIDs) || round.QuestionIDs[len(round.Answers)] != question {
			return repository.ErrInvalidInput
		}
		q := domain.FindQuestion(question)
		if q == nil || selected < 0 || selected > 3 {
			return repository.ErrInvalidInput
		}
		answer := domain.QuizAnswer{QuestionID: question, Selected: selected, Correct: selected == q.Answer}
		attempt := domain.Attempt{ID: uuid.NewSHA1(uuid.NameSpaceOID, []byte("quiz:"+id+":"+question)).String(), UserID: user, QuestionID: question, Selected: selected, Correct: answer.Correct, Mode: domain.AttemptModeQuiz}
		if !answer.Correct {
			due := now.Add(24 * time.Hour)
			attempt.NextReviewAt = &due
		}
		if _, err := NewRepo(tx).SaveAttempt(ctx, attempt); err != nil {
			return err
		}
		round.Answers = append(round.Answers, answer)
		round.RecalculateScore()
		if len(round.Answers) == len(round.QuestionIDs) {
			round.Finish(now)
		}
		return nil
	})
}

func (r *Repo) FinishQuizRound(ctx context.Context, user uint, id string, now time.Time) (*domain.QuizRound, error) {
	return r.mutateQuiz(ctx, user, id, func(_ *gorm.DB, round *domain.QuizRound) error { round.Finish(now); return nil })
}

func (r *Repo) QuizLeaderboard(ctx context.Context, user uint, chapter string) ([]domain.QuizRanking, error) {
	var rows []struct {
		UserID    uint
		Name      string
		Score     int
		ElapsedMS int64
	}
	err := r.db.WithContext(ctx).Raw(`SELECT user_id,name,score,elapsed_ms FROM (
 SELECT r.user_id,COALESCE(NULLIF(u.display_name,''),u.username) AS name,r.score,r.elapsed_ms,r.finished_at,r.id,
 ROW_NUMBER() OVER(PARTITION BY r.user_id ORDER BY r.score DESC,r.elapsed_ms ASC,r.finished_at ASC,r.id ASC) AS best
 FROM user_learning_quiz_rounds r JOIN identity_users u ON u.id=r.user_id
 WHERE r.chapter_id=? AND r.bank_version=? AND r.finished_at IS NOT NULL AND r.answer_count>0 AND u.deleted_at IS NULL AND u.role='student' AND u.status='active'
 ) ranked WHERE best=1 ORDER BY score DESC,elapsed_ms ASC,finished_at ASC,id ASC LIMIT 50`, chapter, domain.QuizBankVersion()).Scan(&rows).Error
	result := make([]domain.QuizRanking, 0, len(rows))
	for i, row := range rows {
		result = append(result, domain.QuizRanking{Rank: i + 1, Name: row.Name, Score: row.Score, ElapsedMS: row.ElapsedMS, IsCurrentUser: row.UserID == user})
	}
	return result, err
}
