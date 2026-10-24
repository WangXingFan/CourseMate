package learning

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestCourseGradingPrivacyRetryAndIsolation(t *testing.T) {
	router := testRouter(t)
	for _, path := range []string{"/learning/course", "/learning/lessons/ss-2-5"} {
		if got := teacherCourseRequest(t, router, 0, http.MethodGet, path, ""); got.Code != http.StatusUnauthorized {
			t.Fatalf("auth: %d", got.Code)
		}
	}
	get := teacherCourseRequest(t, router, 1, http.MethodGet, "/learning/lessons/ss-2-5", "")
	if get.Code != http.StatusOK || get.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("get: %d %s", get.Code, get.Body)
	}
	var detail struct {
		Data LearningCourseLessonResponse `json:"data"`
	}
	if err := json.Unmarshal(get.Body.Bytes(), &detail); err != nil {
		t.Fatal(err)
	}
	if len(detail.Data.Questions) != 3 || len(detail.Data.Attempts) != 0 {
		t.Fatal("unexpected fresh lesson")
	}
	for _, secret := range []string{`"expected":`, `"answer":`, `"explanation":`} {
		if strings.Contains(get.Body.String(), secret) {
			t.Fatalf("private answer leaked: %s", secret)
		}
	}
	input := LearningLessonAttemptRequest{ID: uuid.NewString(), LessonID: "ss-2-5", QuestionID: "ss-2-5-in_class-v1", Version: domain.CourseCatalog().Version, Answers: map[string]string{"f1": "1", "f2": "1", "f3": "3", "f4": "1"}}
	encoded, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	first := teacherCourseRequest(t, router, 1, http.MethodPost, "/learning/lesson-attempts", string(encoded))
	if first.Code != http.StatusOK {
		t.Fatalf("submit: %d %s", first.Code, first.Body)
	}
	var result struct {
		Data LearningLessonAttemptResponse `json:"data"`
	}
	if err := json.Unmarshal(first.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Data.Score != 3 || result.Data.Total != 4 || result.Data.Results[3].Correct {
		t.Fatalf("score: %+v", result.Data)
	}
	second := teacherCourseRequest(t, router, 1, http.MethodPost, "/learning/lesson-attempts", string(encoded))
	if second.Code != http.StatusOK || second.Body.String() != first.Body.String() {
		t.Fatal("retry did not replay original")
	}
	input.Answers["f4"] = "-1"
	changed, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	if got := teacherCourseRequest(t, router, 1, http.MethodPost, "/learning/lesson-attempts", string(changed)); got.Code != http.StatusConflict {
		t.Fatalf("conflict: %d %s", got.Code, got.Body)
	}
	for _, userID := range []uint{1, 2} {
		got := teacherCourseRequest(t, router, userID, http.MethodGet, "/learning/lessons/ss-2-5", "")
		if err := json.Unmarshal(got.Body.Bytes(), &detail); err != nil {
			t.Fatal(err)
		}
		if (userID == 1 && len(detail.Data.Attempts) != 1) || (userID == 2 && len(detail.Data.Attempts) != 0) {
			t.Fatal("attempt count or account isolation failed")
		}
	}
	// The same UUID belongs to a distinct attempt in another account.
	if got := teacherCourseRequest(t, router, 2, http.MethodPost, "/learning/lesson-attempts", string(changed)); got.Code != http.StatusOK {
		t.Fatal(got.Body.String())
	}
	input.ID = uuid.NewString()
	changed, err = json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	if got := teacherCourseRequest(t, router, 1, http.MethodPost, "/learning/lesson-attempts", string(changed)); got.Code != http.StatusOK {
		t.Fatal(got.Body.String())
	}
	got := teacherCourseRequest(t, router, 1, http.MethodGet, "/learning/course", "")
	var catalog struct {
		Data LearningCourseResponse `json:"data"`
	}
	if err := json.Unmarshal(got.Body.Bytes(), &catalog); err != nil {
		t.Fatal(err)
	}
	if got.Code != http.StatusOK || len(catalog.Data.Lessons) != len(domain.CourseCatalog().Lessons) {
		t.Fatalf("catalog: %d", got.Code)
	}
	for _, lesson := range catalog.Data.Lessons {
		if lesson.ID == input.LessonID && (lesson.CompletedStages != 1 || lesson.MasteredStages != 1) {
			t.Fatal("latest attempt was not used for progress")
		}
	}
}

func TestCourseRejectsMalformedAndCrossLessonAnswers(t *testing.T) {
	router := testRouter(t)
	base := LearningLessonAttemptRequest{ID: uuid.NewString(), Version: domain.CourseCatalog().Version, LessonID: "ss-1-1", QuestionID: "ss-1-1-in_class-v1", Answers: map[string]string{"f1": "9/4"}}
	cases := []LearningLessonAttemptRequest{base, base, base, base, base}
	cases[0].Answers = map[string]string{"f1": "1/0"}
	cases[1].Answers = map[string]string{"f1": "9/4", "extra": "1"}
	cases[2].LessonID = "ss-2-5"
	cases[3].Version = "old-version"
	cases[4].Answers = map[string]string{"f1": "x+1"}
	for _, input := range cases {
		body, err := json.Marshal(input)
		if err != nil {
			t.Fatal(err)
		}
		if got := teacherCourseRequest(t, router, 1, http.MethodPost, "/learning/lesson-attempts", string(body)); got.Code != http.StatusBadRequest {
			t.Fatalf("invalid: %d %s", got.Code, got.Body)
		}
	}
	if got := teacherCourseRequest(t, router, 0, http.MethodPost, "/learning/lesson-attempts", "{}"); got.Code != http.StatusUnauthorized {
		t.Fatal("unauthenticated write")
	}
}

func teacherCourseRequest(t *testing.T, router *gin.Engine, userID uint, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	return request(t, router, userID, method, path, body, domainuser.RoleTeacher)
}

func TestCourseStudentsReadNotesButCannotAccessOrSubmitQuestions(t *testing.T) {
	router := testRouter(t)
	input := LearningLessonAttemptRequest{ID: uuid.NewString(), LessonID: "ss-1-1", QuestionID: "ss-1-1-preview-v1", Version: domain.CourseCatalog().Version, Answers: map[string]string{"choice": "0"}}
	encoded, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	// Existing answers and explanations must not leak through the old course route.
	if got := teacherCourseRequest(t, router, 1, http.MethodPost, "/learning/lesson-attempts", string(encoded)); got.Code != http.StatusOK {
		t.Fatal(got.Body.String())
	}
	for _, role := range []string{domainuser.RoleStudent, domainuser.RoleUser, ""} {
		for _, path := range []string{"/learning/lessons/ss-1-1", "/learning/course"} {
			got := request(t, router, 1, http.MethodGet, path, "", role)
			if got.Code != http.StatusOK {
				t.Fatalf("role %q read: %d %s", role, got.Code, got.Body)
			}
			if path == "/learning/course" {
				var catalog struct {
					Data LearningCourseResponse `json:"data"`
				}
				if err := json.Unmarshal(got.Body.Bytes(), &catalog); err != nil {
					t.Fatal(err)
				}
				if catalog.Data.CanPractice || len(catalog.Data.Lessons) == 0 {
					t.Fatalf("role %q has invalid course access", role)
				}
				for _, lesson := range catalog.Data.Lessons {
					if lesson.CompletedStages != 0 || lesson.MasteredStages != 0 {
						t.Fatalf("role %q leaked standalone progress: %+v", role, lesson)
					}
				}
				continue
			}
			var detail struct {
				Data LearningCourseLessonResponse `json:"data"`
			}
			if err := json.Unmarshal(got.Body.Bytes(), &detail); err != nil {
				t.Fatal(err)
			}
			if detail.Data.CanPractice || len(detail.Data.Questions) != 0 || len(detail.Data.Attempts) != 0 || detail.Data.Markdown == "" || detail.Data.Lesson.CompletedStages != 0 {
				t.Fatalf("role %q leaked standalone practice: %+v", role, detail.Data)
			}
		}
		got := request(t, router, 1, http.MethodPost, "/learning/lesson-attempts", string(encoded), role)
		if got.Code != http.StatusForbidden || !strings.Contains(got.Body.String(), "learning.teacher_assigned") {
			t.Fatalf("role %q direct submit: %d %s", role, got.Code, got.Body)
		}
	}
	for _, role := range []string{domainuser.RoleTeacher, domainuser.RoleAdmin, domainuser.RoleSuperAdmin} {
		got := request(t, router, 1, http.MethodGet, "/learning/lessons/ss-1-1", "", role)
		var detail struct {
			Data LearningCourseLessonResponse `json:"data"`
		}
		if err := json.Unmarshal(got.Body.Bytes(), &detail); err != nil {
			t.Fatal(err)
		}
		if !detail.Data.CanPractice || len(detail.Data.Questions) != 3 {
			t.Fatalf("role %q lost teaching preview", role)
		}
	}
}

func TestCourseCatalogOmitsRemovedChaptersAndRenumbersSDomain(t *testing.T) {
	router := testRouter(t)
	got := teacherCourseRequest(t, router, 1, http.MethodGet, "/learning/course", "")
	if got.Code != http.StatusOK {
		t.Fatalf("catalog: %d %s", got.Code, got.Body)
	}
	var catalog struct {
		Data LearningCourseResponse `json:"data"`
	}
	if err := json.Unmarshal(got.Body.Bytes(), &catalog); err != nil {
		t.Fatal(err)
	}
	if len(catalog.Data.Lessons) != 52 {
		t.Fatalf("lessons=%d", len(catalog.Data.Lessons))
	}
	for _, lesson := range catalog.Data.Lessons {
		if strings.HasPrefix(lesson.Chapter, "第0章") || strings.HasPrefix(lesson.Chapter, "第6章") || strings.HasPrefix(lesson.Chapter, "第7章") || strings.HasPrefix(lesson.Chapter, "第4章 离散") {
			t.Fatalf("removed chapter exposed: %#v", lesson)
		}
	}
	var renumbered *LearningCourseLessonSummary
	for index := range catalog.Data.Lessons {
		if catalog.Data.Lessons[index].ID == "ss-5-1" {
			renumbered = &catalog.Data.Lessons[index]
		}
	}
	if renumbered == nil || renumbered.Number != "4.1" || renumbered.Chapter != "第4章 连续系统s域分析" {
		t.Fatalf("renumbered lesson missing: %#v", renumbered)
	}
	for _, lessonID := range []string{"ss-0-1", "ss-4-1", "ss-6-1", "ss-7-1"} {
		got := teacherCourseRequest(t, router, 1, http.MethodGet, "/learning/lessons/"+lessonID, "")
		if got.Code != http.StatusBadRequest {
			t.Fatalf("removed lesson %s: %d %s", lessonID, got.Code, got.Body)
		}
	}
}
