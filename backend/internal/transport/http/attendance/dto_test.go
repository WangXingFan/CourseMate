package attendance

import (
	"encoding/json"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/attendance"
	"strings"
	"testing"
	"time"
)

func TestStudentProjectionOmitsCodeSecretsAndOtherStudents(t *testing.T) {
	v := AttendanceStudentListResponse{Items: []AttendanceStudentItemResponse{{Session: sessionView(domain.Session{ID: "lesson", Secret: "PRIVATE_SECRET"}, time.Now()), Record: recordView(domain.Record{StudentPublicID: "me", FailedAttempts: 4, Corrections: []domain.Correction{}})}}}
	payload, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	for _, forbidden := range []string{"PRIVATE_SECRET", "secret", "code", "attempt", "teacherId"} {
		if strings.Contains(string(payload), forbidden) {
			t.Fatalf("private data leaked: %s", payload)
		}
	}
	if !strings.Contains(string(payload), `"checkedAt":null`) {
		t.Fatalf("missing nullable timestamp: %s", payload)
	}
}
