package learning

import (
	"context"
	"errors"
	"strings"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repo struct{ db *gorm.DB }

func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }

func (r *Repo) SaveAttempt(ctx context.Context, input domain.Attempt) (*domain.Attempt, error) {
	mode := normalizeAttemptMode(input.Mode)
	record := models.LearningAttempt{
		UserID:       input.UserID,
		AttemptID:    input.ID,
		QuestionID:   input.QuestionID,
		Selected:     input.Selected,
		Correct:      input.Correct,
		Mode:         mode,
		VariantID:    input.VariantID,
		ReviewStage:  input.ReviewStage,
		NextReviewAt: cloneTime(input.NextReviewAt),
	}
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

		latestWrong, err := latestAttemptByQuestion(tx, userID, "correct = ? AND COALESCE(NULLIF(mode, ''), 'quiz') = 'quiz'", false)
		if err != nil {
			return err
		}
		latestReview, err := latestAttemptByQuestion(tx, userID, "COALESCE(NULLIF(mode, ''), 'quiz') = ?", domain.AttemptModeReview)
		if err != nil {
			return err
		}

		for _, group := range groups {
			item := domain.QuestionProgress{
				QuestionID:   group.QuestionID,
				Attempts:     group.Attempts,
				CorrectCount: group.CorrectCount,
				Latest:       latest[group.QuestionID],
			}
			if wrong, ok := latestWrong[group.QuestionID]; ok {
				wrongCopy := wrong
				item.LatestWrong = &wrongCopy
				var review *domain.Attempt
				if saved, hasReview := latestReview[group.QuestionID]; hasReview {
					review = &saved
				}
				applyReviewState(&item, wrongCopy, review)
			}
			result.Questions = append(result.Questions, item)
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

func latestAttemptByQuestion(tx *gorm.DB, userID uint, condition string, value any) (map[string]domain.Attempt, error) {
	var groups []struct {
		QuestionID string
		LatestID   uint
	}
	if err := tx.Model(&models.LearningAttempt{}).
		Where("user_id = ? AND "+condition, userID, value).
		Select("question_id, MAX(id) AS latest_id").
		Group("question_id").
		Scan(&groups).Error; err != nil {
		return nil, err
	}
	result := make(map[string]domain.Attempt, len(groups))
	if len(groups) == 0 {
		return result, nil
	}
	ids := make([]uint, 0, len(groups))
	for _, group := range groups {
		ids = append(ids, group.LatestID)
	}
	var records []models.LearningAttempt
	if err := tx.Where("user_id = ? AND id IN ?", userID, ids).Find(&records).Error; err != nil {
		return nil, err
	}
	for _, record := range records {
		result[record.QuestionID] = toAttempt(record)
	}
	return result, nil
}

func applyReviewState(progress *domain.QuestionProgress, wrong domain.Attempt, review *domain.Attempt) {
	stateSource := wrong
	if review != nil {
		stateSource = *review
	}
	progress.ReviewStage = stateSource.ReviewStage
	if progress.ReviewStage < 0 || progress.ReviewStage > 5 {
		progress.ReviewStage = 0
	}
	if progress.ReviewStage >= 5 {
		progress.NextReviewAt = nil
	} else if stateSource.NextReviewAt != nil {
		progress.NextReviewAt = cloneTime(stateSource.NextReviewAt)
	} else if !stateSource.CreatedAt.IsZero() {
		// Legacy rows predate the scheduling columns. Their first review is due
		// one day after the saved mistake, without requiring a data migration.
		due := stateSource.CreatedAt.UTC().Add(24 * time.Hour)
		progress.NextReviewAt = &due
	}
	progress.SuggestedVariantID = domain.SuggestedVariant(progress.QuestionID, progress.ReviewStage)
}

func toAttempt(record models.LearningAttempt) domain.Attempt {
	return domain.Attempt{
		ID:           record.AttemptID,
		UserID:       record.UserID,
		QuestionID:   record.QuestionID,
		Selected:     record.Selected,
		Correct:      record.Correct,
		Mode:         normalizeAttemptMode(record.Mode),
		VariantID:    record.VariantID,
		ReviewStage:  record.ReviewStage,
		NextReviewAt: cloneTime(record.NextReviewAt),
		CreatedAt:    record.CreatedAt,
	}
}

func normalizeAttemptMode(mode string) string {
	if strings.EqualFold(strings.TrimSpace(mode), domain.AttemptModeReview) {
		return domain.AttemptModeReview
	}
	return domain.AttemptModeQuiz
}

func cloneTime(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	copy := value.UTC()
	return &copy
}

// SaveReview serializes reviews on a stable mistake row before reading the stage.
func (r *Repo) SaveReview(ctx context.Context, input domain.Attempt, now time.Time) (*domain.Attempt, error) {
	var result *domain.Attempt
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing models.LearningAttempt
		lookup := tx.Where("user_id = ? AND attempt_id = ?", input.UserID, input.ID).First(&existing).Error
		if lookup == nil {
			saved := toAttempt(existing)
			result = &saved
			return nil
		}
		if !errors.Is(lookup, gorm.ErrRecordNotFound) {
			return lookup
		}
		var anchor models.LearningAttempt
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("user_id = ? AND question_id = ? AND correct = ?", input.UserID, input.QuestionID, false).Order("id ASC").First(&anchor).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		if err != nil {
			return err
		}
		repo := NewRepo(tx)
		progress, err := repo.Progress(ctx, input.UserID)
		if err != nil {
			return err
		}
		for _, question := range progress.Questions {
			if question.QuestionID == input.QuestionID {
				input.ReviewStage, input.NextReviewAt = domain.ScheduleReview(question.ReviewStage, input.Correct, now)
				break
			}
		}
		result, err = repo.SaveAttempt(ctx, input)
		return err
	})
	return result, err
}
