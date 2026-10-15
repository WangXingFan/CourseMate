package admin

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	appadmin "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/admin"
	auditapp "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/audit"
	userapp "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/user"
	domainaudit "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/audit"
	domainknowledgebase "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/knowledgebase"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

func TestPatchUserReturnsForbiddenWhenAdminManagesSuperAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	users := &handlerUserServiceFake{users: map[uint]domainuser.User{
		1: {ID: 1, Role: domainuser.RoleAdmin},
		2: {ID: 2, Role: domainuser.RoleSuperAdmin},
	}}
	handler := NewHandler(appadmin.NewService(users, handlerAuditServiceFake{}))

	router := gin.New()
	router.PATCH("/admin/users/:id", func(c *gin.Context) {
		c.Set(middleware.ContextKeyUserID, uint(1))
		c.Set(middleware.ContextKeyRequestID, "req_test")
		handler.PatchUser(c)
	})

	request := httptest.NewRequest(http.MethodPatch, "/admin/users/2", strings.NewReader(`{"displayName":"Root"}`))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected forbidden, got status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "user.superadmin_management_protected") {
		t.Fatalf("expected superadmin management error code, got body=%s", recorder.Body.String())
	}
}

func TestDeleteUserReturnsConflictForBuiltinKnowledgeBaseFileOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	users := &handlerUserServiceFake{
		users: map[uint]domainuser.User{
			1: {ID: 1, Role: domainuser.RoleSuperAdmin},
			2: {ID: 2, Role: domainuser.RoleAdmin},
		},
		deleteErr: domainknowledgebase.ErrBuiltinFileOwnerDeleteBlocked,
	}
	handler := NewHandler(appadmin.NewService(users, handlerAuditServiceFake{}))
	router := gin.New()
	router.DELETE("/admin/users/:id", func(c *gin.Context) {
		c.Set(middleware.ContextKeyUserID, uint(1))
		c.Set(middleware.ContextKeyRequestID, "req_delete")
		handler.DeleteUser(c)
	})

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodDelete, "/admin/users/2", nil))

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected conflict, got status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "knowledge_base.owner_file_reference") {
		t.Fatalf("expected stable knowledge-base ownership error code, got body=%s", recorder.Body.String())
	}
}

type handlerUserServiceFake struct {
	users     map[uint]domainuser.User
	deleteErr error
}

func (s *handlerUserServiceFake) ListUsers(context.Context, int, int, repository.UserListFilter) ([]domainuser.User, int64, error) {
	return nil, 0, nil
}

func (s *handlerUserServiceFake) ListIdentityProviders(context.Context, bool) ([]domainuser.IdentityProvider, error) {
	return []domainuser.IdentityProvider{}, nil
}

func (s *handlerUserServiceFake) ListUserIdentitiesByUserIDs(context.Context, []uint) (map[uint][]domainuser.UserIdentity, error) {
	return map[uint][]domainuser.UserIdentity{}, nil
}

func (s *handlerUserServiceFake) ListLatestSessionActivityByUserIDs(context.Context, []uint) (map[uint]time.Time, error) {
	return map[uint]time.Time{}, nil
}

func (s *handlerUserServiceFake) CountSuperAdmins(context.Context) (int64, error) {
	var count int64
	for _, item := range s.users {
		if item.Role == domainuser.RoleSuperAdmin {
			count++
		}
	}
	return count, nil
}

func (s *handlerUserServiceFake) CreateUser(context.Context, userapp.CreateUserInput) (*domainuser.User, error) {
	return nil, nil
}

func (s *handlerUserServiceFake) GetByID(_ context.Context, userID uint) (*domainuser.User, error) {
	item, ok := s.users[userID]
	if !ok {
		return nil, repository.ErrNotFound
	}
	return &item, nil
}

func (s *handlerUserServiceFake) RevokeAllSessions(context.Context, uint, string) error {
	return nil
}

func (s *handlerUserServiceFake) UpdateUserStatus(context.Context, uint, string) error {
	return nil
}

func (s *handlerUserServiceFake) UpdateFields(context.Context, uint, repository.UpdateUserFieldsInput) (*domainuser.User, error) {
	return nil, nil
}

func (s *handlerUserServiceFake) ResetLoginFailure(context.Context, uint) error {
	return nil
}

func (s *handlerUserServiceFake) ResetPasswordByAdmin(context.Context, uint, string, bool) error {
	return nil
}

func (s *handlerUserServiceFake) DeleteAccountHard(context.Context, uint) error {
	return s.deleteErr
}

func (s *handlerUserServiceFake) RecordAuthEvent(context.Context, repository.AuthEventInput) error {
	return nil
}

func (s *handlerUserServiceFake) ListAuthEvents(context.Context, userapp.AuthEventListInput) ([]domainuser.AuthEvent, int64, error) {
	return nil, 0, nil
}

type handlerAuditServiceFake struct{}

func (handlerAuditServiceFake) Write(context.Context, auditapp.WriteInput) {}

func (handlerAuditServiceFake) List(context.Context, int, int, auditapp.ListFilter) ([]domainaudit.Log, int64, error) {
	return nil, 0, nil
}
