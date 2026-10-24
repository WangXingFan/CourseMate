package knowledgebase

import (
	"context"
	"encoding/json"
	"errors"

	domainknowledgebase "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/knowledgebase"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/dberror"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (r *Repo) GetBuiltinKnowledgeBaseSeed(ctx context.Context, key string) (*repository.BuiltinKnowledgeBaseSeed, error) {
	var row models.BuiltinKnowledgeBaseSeed
	if err := r.db.WithContext(ctx).Where("key = ?", key).First(&row).Error; err != nil {
		return nil, dberror.Translate(err)
	}
	var fileIDs []string
	if err := json.Unmarshal([]byte(row.FileIDs), &fileIDs); err != nil {
		return nil, err
	}
	return &repository.BuiltinKnowledgeBaseSeed{Key: row.Key, Version: row.Version, PublicID: row.PublicID, FileIDs: fileIDs}, nil
}

func (r *Repo) BuiltinKnowledgeBaseExists(ctx context.Context, publicID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.KnowledgeBase{}).
		Where("public_id = ? AND scope = ? AND owner_user_id = 0", publicID, domainknowledgebase.ScopeBuiltin).Count(&count).Error
	return count > 0, dberror.Translate(err)
}

// ApplyBuiltinKnowledgeBase atomically switches only package-managed links.
// Uploads are content-deduplicated before this transaction; a failed/interrupted
// import leaves the previous library intact and can safely resume on startup.
func (r *Repo) ApplyBuiltinKnowledgeBase(ctx context.Context, input repository.BuiltinKnowledgeBaseInput) error {
	if input.Key == "" || input.Version == "" || input.PublicID == "" || len(input.FileIDs) == 0 {
		return repository.ErrInvalidInput
	}
	payload, err := json.Marshal(input.FileIDs)
	if err != nil {
		return err
	}
	return dberror.Translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		seed := models.BuiltinKnowledgeBaseSeed{Key: input.Key, PublicID: input.PublicID, FileIDs: "[]"}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&seed).Error; err != nil {
			return err
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("key = ?", input.Key).First(&seed).Error; err != nil {
			return err
		}
		if seed.Version == input.Version {
			return nil
		}
		var base models.KnowledgeBase
		lookupErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("public_id = ?", seed.PublicID).First(&base).Error
		if errors.Is(lookupErr, gorm.ErrRecordNotFound) {
			if seed.Version != "" {
				return nil // An administrator deleted the seeded library.
			}
			base = models.KnowledgeBase{
				PublicID: seed.PublicID, Scope: domainknowledgebase.ScopeBuiltin,
				Name: input.Name, Description: input.Description, Enabled: true, SortOrder: 1, Revision: 1,
			}
			// A manually created library with the course name belongs to the admin.
			// Create a distinctly named bundled library rather than adopting it.
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&base).Error; err != nil {
				return err
			}
			if base.ID == 0 {
				base.Name = input.Name + "（CourseMate 内置）"
				if err := tx.Create(&base).Error; err != nil {
					return err
				}
			}
		} else if lookupErr != nil {
			return lookupErr
		}
		if base.Scope != domainknowledgebase.ScopeBuiltin || base.OwnerUserID != 0 {
			return repository.ErrInvalidInput
		}
		var files []models.FileObject
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("file_id IN ? AND user_id = 0 AND status = ?", input.FileIDs, "active").Find(&files).Error; err != nil {
			return err
		}
		if len(files) != len(input.FileIDs) {
			return repository.ErrNotFound
		}
		var previousIDs []string
		if err := json.Unmarshal([]byte(seed.FileIDs), &previousIDs); err != nil {
			return err
		}
		if len(previousIDs) > 0 {
			if err := tx.Where("knowledge_base_id = ? AND file_object_id IN (?)", base.ID,
				tx.Model(&models.FileObject{}).Select("id").Where("file_id IN ? AND file_id NOT IN ?", previousIDs, input.FileIDs),
			).Delete(&models.KnowledgeBaseFile{}).Error; err != nil {
				return err
			}
		}
		byPublicID := make(map[string]uint, len(files))
		for _, file := range files {
			byPublicID[file.FileID] = file.ID
		}
		links := make([]models.KnowledgeBaseFile, 0, len(files))
		for index, fileID := range input.FileIDs {
			links = append(links, models.KnowledgeBaseFile{KnowledgeBaseID: base.ID, FileObjectID: byPublicID[fileID], SortOrder: index + 1})
		}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&links).Error; err != nil {
			return err
		}
		if err := tx.Model(&base).Update("revision", gorm.Expr("revision + 1")).Error; err != nil {
			return err
		}
		return tx.Model(&seed).Updates(map[string]any{"version": input.Version, "file_ids": string(payload)}).Error
	}))
}
