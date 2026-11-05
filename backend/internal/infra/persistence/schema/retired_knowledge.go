package schema

import (
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/gorm"
	"strings"
)

// The removed bundled importer used this reserved ID, never a teacher-created
// UUID. Disable its catalog entry without deleting files or matching by name.
func retireBundledSignalsKnowledgeBase(db *gorm.DB) error {
	if err := db.Model(&models.KnowledgeBase{}).
		Where("public_id = ? AND scope = ? AND owner_user_id = 0 AND enabled = ?", "kb_signals_systems", "builtin", true).
		Updates(map[string]any{"enabled": false, "revision": gorm.Expr("revision + 1")}).Error; err != nil {
		return err
	}
	var setting models.SystemSetting
	if err := db.Where("namespace = ? AND key = ?", "knowledgebase", "default_knowledge_base_ids").Limit(1).Find(&setting).Error; err != nil {
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
	return db.Model(&setting).Update("value", strings.Join(ids, ",")).Error
}
