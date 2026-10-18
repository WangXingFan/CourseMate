package learning

import (
	"context"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repo struct{ db *gorm.DB }

func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }

func (r *Repo) SaveAttempt(ctx context.Context, input domain.Attempt) (*domain.Attempt, error) {
	record := models.LearningAttempt{UserID: input.UserID, AttemptID: input.ID, QuestionID: input.QuestionID, Selected: input.Selected, Correct: input.Correct}
	if err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "user_id"}, {Name: "attempt_id"}}, DoNothing: true,
	}).Create(&record).Error; err != nil {
		return nil, err
	}
	// Always read the original row: retries neither change the answer nor its timestamp.
	record = models.LearningAttempt{}
	if err := r.db.WithContext(ctx).Where("user_id = ? AND attempt_id = ?", input.UserID, input.ID).First(&record).Error; err != nil {
		return nil, err
	}
	item := toAttempt(record)
	return &item, nil
}

func (r *Repo) Progress(ctx context.Context, userID uint) (*domain.Progress, error) {
	result := &domain.Progress{Questions: make([]domain.QuestionProgress, 0), Recent: make([]domain.Attempt, 0)}
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var groups []struct {
			QuestionID   string
			Attempts     int64
			CorrectCount int64
			LatestID     uint
		}
		if err := tx.Model(&models.LearningAttempt{}).Where("user_id = ?", userID).
			Select("question_id, COUNT(*) AS attempts, SUM(CASE WHEN correct THEN 1 ELSE 0 END) AS correct_count, MAX(id) AS latest_id").
			Group("question_id").Scan(&groups).Error; err != nil {
			return err
		}
		ids := make([]uint, 0, len(groups))
		for _, group := range groups {
			ids = append(ids, group.LatestID)
		}
		latest := make(map[string]domain.Attempt, len(groups))
		if len(ids) > 0 {
			var records []models.LearningAttempt
			if err := tx.Where("user_id = ? AND id IN ?", userID, ids).Find(&records).Error; err != nil {
				return err
			}
			for _, record := range records {
				latest[record.QuestionID] = toAttempt(record)
			}
		}
		for _, group := range groups {
			result.Questions = append(result.Questions, domain.QuestionProgress{QuestionID: group.QuestionID, Attempts: group.Attempts, CorrectCount: group.CorrectCount, Latest: latest[group.QuestionID]})
		}
		var recent []models.LearningAttempt
		if err := tx.Where("user_id = ?", userID).Order("id DESC").Limit(40).Find(&recent).Error; err != nil {
			return err
		}
		for _, record := range recent {
			result.Recent = append(result.Recent, toAttempt(record))
		}
		return nil
	})
	return result, err
}

func toAttempt(record models.LearningAttempt) domain.Attempt {
	return domain.Attempt{ID: record.AttemptID, UserID: record.UserID, QuestionID: record.QuestionID, Selected: record.Selected, Correct: record.Correct, CreatedAt: record.CreatedAt}
}
