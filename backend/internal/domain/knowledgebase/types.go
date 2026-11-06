package knowledgebase

import "time"

const (
	// ScopeBuiltin 表示管理员维护、所有登录用户可见的内置知识库。
	ScopeBuiltin = "builtin"
	// ScopeUser 表示用户所有的知识库；教师知识库也对其班级学生和管理员可见。
	ScopeUser = "user"
)

// KnowledgeBase 表示一组可统一检索的文件集合。
type KnowledgeBase struct {
	ID                  uint
	PublicID            string
	Scope               string
	OwnerUserID         uint
	Name                string
	Description         string
	Enabled             bool
	SortOrder           int
	Revision            uint64
	FileCount           int64
	ReadyFileCount      int64
	ProcessingFileCount int64
	CreatedByUserID     uint
	UpdatedByUserID     uint
	CreatedAt           time.Time
	UpdatedAt           time.Time
}
