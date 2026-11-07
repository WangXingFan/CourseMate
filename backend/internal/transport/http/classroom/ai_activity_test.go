package classroom

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
)

func (r *handlerTestRepository) ListAIActivityEvents(_ context.Context, _ []uint, _ time.Time) ([]domain.AIActivityEvent, error) {
	return []domain.AIActivityEvent{}, nil
}

func TestAIActivityAuthorizationDatesAndStudentPrivacy(t *testing.T) {
	router, _ := newClassroomHandlerTest(t)
	path := "/api/v1/classrooms/class_one/ai-activity?startDate=2026-10-19&endDate=2026-10-25"
	for _, actor := range []uint{3, 4} {
		res := performClassroomRequest(router, http.MethodGet, path, "", actor)
		if res.Code != 403 {
			t.Fatalf("unauthorized: %d %s", res.Code, res.Body)
		}
	}
	res := performClassroomRequest(router, http.MethodGet, "/api/v1/classrooms/foreign/ai-activity", "", 0)
	if res.Code != 404 {
		t.Fatalf("foreign class: %s", res.Body)
	}
	for _, query := range []string{"startDate=bad", "startDate=2026-10-26&endDate=2026-10-25", "endDate=2999-01-01"} {
		res = performClassroomRequest(router, http.MethodGet, "/api/v1/classrooms/class_one/ai-activity?"+query, "", 0)
		if res.Code != 400 {
			t.Fatalf("invalid date accepted: %s", res.Body)
		}
	}
	res = performClassroomRequest(router, http.MethodGet, path, "", 0)
	var envelope struct {
		Data AIActivityResponse `json:"data"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil || res.Code != 200 {
		t.Fatalf("report: %s %v", res.Body, err)
	}
	if len(envelope.Data.Report.Students) != 2 || envelope.Data.Report.Students[0].Final == nil || *envelope.Data.Report.Students[0].Final != 0 {
		t.Fatalf("zero student missing: %s", res.Body)
	}
	res = performClassroomRequest(router, http.MethodGet, "/api/v1/student/ai-activity", "", 4)
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil || res.Code != 200 {
		t.Fatalf("student: %s %v", res.Body, err)
	}
	if len(envelope.Data.Report.Students) != 1 || envelope.Data.Report.Students[0].StudentID != "student_4" || strings.Contains(res.Body.String(), "student_6") {
		t.Fatalf("peer data exposed: %s", res.Body)
	}
}
