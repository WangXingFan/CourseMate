package classroom

import (
	"context"
	"fmt"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
)

// Read metadata only. Loading earlier question metadata keeps retries/edits
// deduplicated even when their source predates the selected reporting range.
func (r *Repo) ListAIActivityEvents(ctx context.Context, users []uint, end time.Time) ([]domain.AIActivityEvent, error) {
	events := []domain.AIActivityEvent{}
	if len(users) == 0 {
		return events, nil
	}
	type question struct {
		models.BaseModel
		UserID, ConversationID uint
		RunID, BranchReason    string
		SourceMessageID        *uint
		HasContent             bool
	}
	var questions []question
	if err := r.db.WithContext(ctx).Unscoped().Model(&models.Message{}).
		Select("id, created_at, deleted_at, user_id, conversation_id, run_id, branch_reason, source_message_id, TRIM(content) <> '' AS has_content").
		Where("user_id IN ? AND role = ? AND created_at < ?", users, "user", end).Find(&questions).Error; err != nil {
		return nil, err
	}
	byID, byRun := map[uint]question{}, map[string]question{}
	for _, q := range questions {
		byID[q.ID] = q
		if q.RunID != "" {
			byRun[q.RunID] = q
		}
	}
	var replies []models.Message
	if err := r.db.WithContext(ctx).Select("id, created_at, user_id, conversation_id, run_id, parent_message_id, branch_reason").
		Where("user_id IN ? AND role = ? AND status = ? AND run_id <> '' AND TRIM(content) <> '' AND created_at < ?", users, "assistant", "success", end).
		Order("created_at, id").Find(&replies).Error; err != nil {
		return nil, err
	}
	for _, reply := range replies {
		q, ok := byRun[reply.RunID]
		// Assistant regeneration reuses the user message with a new run ID.
		if !ok && reply.BranchReason == "retry" && reply.ParentMessageID != nil {
			q, ok = byID[*reply.ParentMessageID]
		}
		if !ok || q.DeletedAt.Valid || !q.HasContent || q.UserID != reply.UserID || q.ConversationID != reply.ConversationID {
			continue
		}
		root := q
		for root.SourceMessageID != nil && (root.BranchReason == "edit" || root.BranchReason == "retry") {
			source, exists := byID[*root.SourceMessageID]
			if !exists || source.UserID != q.UserID || source.ConversationID != q.ConversationID || source.ID >= root.ID {
				return nil, fmt.Errorf("AI activity message %d: invalid source %d", root.ID, *root.SourceMessageID)
			}
			root = source
		}
		// Forked/imported history has no originating run; copying it is not usage.
		if root.RunID == "" {
			continue
		}
		events = append(events, domain.AIActivityEvent{UserID: q.UserID, RootMessageID: root.ID, QuestionAt: root.CreatedAt, At: reply.CreatedAt})
	}
	return events, nil
}
