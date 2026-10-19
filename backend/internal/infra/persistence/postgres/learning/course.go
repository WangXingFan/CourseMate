package learning

import (
	"context"
	"encoding/json"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/gorm/clause"
)

func (r *Repo) SaveLessonAttempt(ctx context.Context, input domain.LessonAttempt) (*domain.LessonAttempt, error) {
	payload, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}
	record := models.LearningLessonAttempt{UserID: input.UserID, AttemptID: input.ID, Version: input.Version, QuestionID: input.QuestionID, Payload: string(payload), CreatedAt: input.CreatedAt}
	if err := r.db.WithContext(ctx).Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "user_id"}, {Name: "attempt_id"}}, DoNothing: true}).Create(&record).Error; err != nil {
		return nil, err
	}
	record = models.LearningLessonAttempt{}
	if err := r.db.WithContext(ctx).Where("user_id = ? AND attempt_id = ?", input.UserID, input.ID).First(&record).Error; err != nil {
		return nil, err
	}
	return decodeLessonAttempt(record)
}

func (r *Repo) LatestLessonAttempts(ctx context.Context, userID uint, version string) ([]domain.LessonAttempt, error) {
	var records []models.LearningLessonAttempt
	latest := r.db.Model(&models.LearningLessonAttempt{}).Select("MAX(id)").Where("user_id = ? AND version = ?", userID, version).Group("question_id")
	if err := r.db.WithContext(ctx).Where("user_id = ? AND version = ? AND id IN (?)", userID, version, latest).Order("id ASC").Find(&records).Error; err != nil {
		return nil, err
	}
	result := make([]domain.LessonAttempt, 0, len(records))
	for _, record := range records {
		item, err := decodeLessonAttempt(record)
		if err != nil {
			return nil, err
		}
		result = append(result, *item)
	}
	return result, nil
}

func decodeLessonAttempt(record models.LearningLessonAttempt) (*domain.LessonAttempt, error) {
	var item domain.LessonAttempt
	if err := json.Unmarshal([]byte(record.Payload), &item); err != nil {
		return nil, err
	}
	item.UserID = record.UserID
	return &item, nil
}
