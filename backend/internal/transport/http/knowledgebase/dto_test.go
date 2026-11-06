package knowledgebase

import (
	"testing"

	domainknowledgebase "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/knowledgebase"
)

func TestKnowledgeBaseManagementCapability(t *testing.T) {
	for _, tt := range []struct {
		name      string
		scope     string
		userID    uint
		admin     bool
		canManage bool
	}{
		{"teacher owns library", "user", 11, false, true},
		{"student reads teacher library", "user", 21, false, false},
		{"admin reads teacher library", "user", 99, true, false},
		{"admin manages platform library", "builtin", 99, true, true},
		{"student reads platform library", "builtin", 21, false, false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			item := domainknowledgebase.KnowledgeBase{Scope: tt.scope, OwnerUserID: 11}
			if got := toKnowledgeBaseResponse(item, tt.userID, tt.admin).CanManage; got != tt.canManage {
				t.Fatalf("canManage = %v, want %v", got, tt.canManage)
			}
		})
	}
}
