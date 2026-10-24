package learning

import (
	"context"
	"errors"
	"testing"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/google/uuid"
)

func TestStandaloneCourseSubmissionRequiresTeachingRole(t *testing.T) {
	service := NewService(nil)
	for _, role := range []string{domainuser.RoleStudent, domainuser.RoleUser, ""} {
		_, err := service.SubmitLesson(context.Background(), 1, role, uuid.NewString(), "ss-1-1", "ss-1-1-preview-v1", domain.CourseCatalog().Version, map[string]string{"choice": "0"})
		if !errors.Is(err, ErrCourseAssigned) {
			t.Fatalf("role %q bypassed classroom assignment: %v", role, err)
		}
	}
}
