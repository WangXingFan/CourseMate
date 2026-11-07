package classroom

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
)

func (r *handlerTestRepository) SavePerformanceRecord(_ context.Context, in domain.PerformanceRecord) error {
	r.performanceRecords = append(r.performanceRecords, in)
	return nil
}
func (r *handlerTestRepository) ListPerformanceRecords(_ context.Context, id uint) ([]domain.PerformanceRecord, error) {
	items := []domain.PerformanceRecord{}
	for _, x := range r.performanceRecords {
		if x.ClassroomID == id {
			items = append(items, x)
		}
	}
	return items, nil
}
func (r *handlerTestRepository) GetPerformanceRecord(_ context.Context, id uint, key string) (*domain.PerformanceRecord, error) {
	for _, x := range r.performanceRecords {
		if x.ClassroomID == id && x.ID == key {
			return &x, nil
		}
	}
	return nil, repository.ErrNotFound
}

func TestPerformancePreviewPublicationIsolationAndStalePreview(t *testing.T) {
	router, repo := newClassroomHandlerTest(t)
	closed := time.Now().Add(-time.Hour)
	repo.quizzes = []domain.Quiz{{ID: 1, PublicID: "q", ClassroomID: 10, Phase: "pre_class", Status: "closed", ClosedAt: &closed, Questions: []domain.QuizQuestion{{ID: "q", Options: []string{"A", "B"}, Answer: 0}}}, {ID: 2, PublicID: "ongoing", ClassroomID: 10, Status: "open"}}
	repo.submissions = []domain.QuizSubmission{{ID: 1, QuizID: 1, StudentID: 4, Answers: []int{0}}}
	path := "/api/v1/classrooms/class_one/performance"
	for _, actor := range []uint{3, 4} {
		res := performClassroomRequest(router, http.MethodPost, path+"/preview", `{}`, actor)
		if res.Code != 403 {
			t.Fatalf("unauthorized preview: %d", res.Code)
		}
	}
	res := performClassroomRequest(router, http.MethodPost, "/api/v1/classrooms/foreign/performance/preview", `{}`, 0)
	if res.Code != 404 {
		t.Fatal("foreign class exposed")
	}
	for _, body := range []string{`{"startAt":"2026-11-10T00:00:00Z","endAt":"2026-11-01T00:00:00Z"}`, `{"quizIds":["ongoing"]}`, `{"quizIds":["foreign"]}`} {
		res = performClassroomRequest(router, http.MethodPost, path+"/preview", body, 0)
		if res.Code != 400 {
			t.Fatalf("invalid scope accepted: %s", res.Body)
		}
	}
	res = performClassroomRequest(router, http.MethodPost, path+"/preview", `{"quizIds":[]}`, 0)
	var preview struct {
		Data PerformanceResponse `json:"data"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &preview); err != nil || res.Code != 200 {
		t.Fatalf("preview: %s %v", res.Body, err)
	}
	if len(preview.Data.Report.Activities) != 1 || *preview.Data.Report.Students[0].Final != 100 || *preview.Data.Report.Students[1].Final != 0 {
		t.Fatalf("preview: %+v", preview.Data.Report)
	}
	body := `{"title":"期中","options":{"quizIds":[]},"fingerprint":"` + preview.Data.Report.Fingerprint + `","corrections":[{"studentId":"student_4","score":90,"reason":"教师核对"}]}`
	repo.submissions[0].Answers = []int{1}
	res = performClassroomRequest(router, http.MethodPost, path+"/records", body, 0)
	if res.Code != 400 {
		t.Fatal("stale preview finalized")
	}
	repo.submissions[0].Answers = []int{0}
	res = performClassroomRequest(router, http.MethodPost, path+"/records", body, 0)
	if res.Code != 200 {
		t.Fatalf("finalize: %s", res.Body)
	}
	if len(repo.performanceRecords) != 1 || *repo.performanceRecords[0].Report.Students[0].Final != 90 {
		t.Fatal("correction not persisted")
	}
	res = performClassroomRequest(router, http.MethodGet, "/api/v1/student/performance", "", 4)
	var own struct {
		Data PerformanceRecordResponse `json:"data"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &own); err != nil || own.Data.Record == nil {
		t.Fatalf("student %v %s", err, res.Body)
	}
	if len(own.Data.Record.Report.Students) != 1 || own.Data.Record.Report.Students[0].StudentID != "student_4" || strings.Contains(res.Body.String(), "student_6") {
		t.Fatalf("peer data exposed: %s", res.Body)
	}
	if len(repo.performanceRecords[0].Report.Students) != 2 {
		t.Fatal("student read mutated record")
	}
}
