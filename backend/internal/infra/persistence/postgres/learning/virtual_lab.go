package learning

import (
	"context"
	"errors"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (r *Repo) GetVirtualLab(ctx context.Context, userID uint) (*domain.VirtualLab, error) {
	var row models.LearningVirtualLab
	err := r.db.WithContext(ctx).First(&row, "user_id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return &domain.VirtualLab{UserID: userID}, nil
	}
	if err != nil {
		return nil, err
	}
	return labRecord(row), nil
}

func (r *Repo) SaveVirtualLab(ctx context.Context, userID uint, revision uint64, document string) (*domain.VirtualLab, error) {
	now := time.Now().UTC()
	row := models.LearningVirtualLab{UserID: userID, Revision: revision + 1, Document: document, UpdatedAt: now}
	db := r.db.WithContext(ctx)
	if revision == 0 {
		result := db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "user_id"}}, DoNothing: true}).Create(&row)
		if result.Error != nil {
			return nil, result.Error
		}
		if result.RowsAffected == 1 {
			return labRecord(row), nil
		}
	} else {
		result := db.Model(&models.LearningVirtualLab{}).Where("user_id = ? AND revision = ?", userID, revision).
			Updates(map[string]any{"revision": revision + 1, "document": document, "updated_at": now})
		if result.Error != nil {
			return nil, result.Error
		}
		if result.RowsAffected == 1 {
			return labRecord(row), nil
		}
	}
	// A lost response can safely retry the same document without advancing revision.
	current, err := r.GetVirtualLab(ctx, userID)
	if err != nil {
		return nil, err
	}
	if current.Document == document {
		return current, nil
	}
	return nil, domain.ErrVirtualLabConflict
}

func labRecord(row models.LearningVirtualLab) *domain.VirtualLab {
	return &domain.VirtualLab{UserID: row.UserID, Revision: row.Revision, Document: row.Document, UpdatedAt: &row.UpdatedAt}
}
