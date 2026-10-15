package repository

import (
	"context"
	"time"
)

const (
	LogCleanupTypeAudit        = "audit"
	LogCleanupTypeAuth         = "auth"
	LogCleanupTypeConversation = "conversation"
	LogCleanupTypeModeration   = "moderation"
)

// LogCleanupRepository 定义管理员日志物理清理能力。
type LogCleanupRepository interface {
	DeleteBefore(ctx context.Context, logType string, before time.Time) (int64, error)
}
