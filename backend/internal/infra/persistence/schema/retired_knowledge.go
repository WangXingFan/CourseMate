package schema

import (
	"strings"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/gorm"
)

// The removed bundled importer used this reserved ID, never a teacher-created
// UUID. Remove its catalog entry and associations without deleting shared files
// or matching teacher-created libraries by name.
func retireBundledSignalsKnowledgeBase(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var bundled models.KnowledgeBase
		if err := tx.Where("public_id = ? AND scope = ? AND owner_user_id = 0", "kb_signals_systems", "builtin").Limit(1).Find(&bundled).Error; err != nil {
			return err
		}
		if bundled.ID != 0 {
			if err := tx.Where("knowledge_base_id = ?", bundled.ID).Delete(&models.KnowledgeBaseFile{}).Error; err != nil {
				return err
			}
			if err := tx.Delete(&bundled).Error; err != nil {
				return err
			}
		}
		var setting models.SystemSetting
		if err := tx.Where("namespace = ? AND key = ?", "knowledgebase", "default_knowledge_base_ids").Limit(1).Find(&setting).Error; err != nil {
			return err
		}
		if setting.ID == 0 {
			return nil
		}
		ids := []string{}
		changed := false
		for _, id := range strings.Split(setting.Value, ",") {
			if strings.TrimSpace(id) == "kb_signals_systems" {
				changed = true
			} else {
				ids = append(ids, id)
			}
		}
		if !changed {
			return nil
		}
		return tx.Model(&setting).Update("value", strings.Join(ids, ",")).Error
	})
}
