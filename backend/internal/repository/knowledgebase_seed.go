package repository

import "context"

// BuiltinKnowledgeBaseSeed tracks the files managed by a bundled content package.
// Keeping this record after a library is deleted prevents restart resurrection.
type BuiltinKnowledgeBaseSeed struct {
	Key      string
	Version  string
	PublicID string
	FileIDs  []string
}

type BuiltinKnowledgeBaseInput struct {
	BuiltinKnowledgeBaseSeed
	Name        string
	Description string
}

type BuiltinKnowledgeBaseRepository interface {
	GetBuiltinKnowledgeBaseSeed(ctx context.Context, key string) (*BuiltinKnowledgeBaseSeed, error)
	BuiltinKnowledgeBaseExists(ctx context.Context, publicID string) (bool, error)
	ApplyBuiltinKnowledgeBase(ctx context.Context, input BuiltinKnowledgeBaseInput) error
}
