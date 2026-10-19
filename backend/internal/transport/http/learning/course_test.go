package learning

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/google/uuid"
)

func TestCourseGradingPrivacyRetryAndIsolation(t *testing.T) {
	router := testRouter(t)
	for _, path := range []string{"/learning/course", "/learning/lessons/ss-2-5"} {
		if got := request(t, router, 0, http.MethodGet, path, ""); got.Code != http.StatusUnauthorized {
			t.Fatalf("auth: %d", got.Code)
		}
	}
	get := request(t, router, 1, http.MethodGet, "/learning/lessons/ss-2-5", "")
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
	first := request(t, router, 1, http.MethodPost, "/learning/lesson-attempts", string(encoded))
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
	second := request(t, router, 1, http.MethodPost, "/learning/lesson-attempts", string(encoded))
	if second.Code != http.StatusOK || second.Body.String() != first.Body.String() {
		t.Fatal("retry did not replay original")
	}
	input.Answers["f4"] = "-1"
	changed, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	if got := request(t, router, 1, http.MethodPost, "/learning/lesson-attempts", string(changed)); got.Code != http.StatusConflict {
		t.Fatalf("conflict: %d %s", got.Code, got.Body)
	}
	for _, userID := range []uint{1, 2} {
		got := request(t, router, userID, http.MethodGet, "/learning/lessons/ss-2-5", "")
		if err := json.Unmarshal(got.Body.Bytes(), &detail); err != nil {
			t.Fatal(err)
		}
		if (userID == 1 && len(detail.Data.Attempts) != 1) || (userID == 2 && len(detail.Data.Attempts) != 0) {
			t.Fatal("attempt count or account isolation failed")
		}
	}
	// The same UUID belongs to a distinct attempt in another account.
	if got := request(t, router, 2, http.MethodPost, "/learning/lesson-attempts", string(changed)); got.Code != http.StatusOK {
		t.Fatal(got.Body.String())
	}
	input.ID = uuid.NewString()
	changed, err = json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	if got := request(t, router, 1, http.MethodPost, "/learning/lesson-attempts", string(changed)); got.Code != http.StatusOK {
		t.Fatal(got.Body.String())
	}
	got := request(t, router, 1, http.MethodGet, "/learning/course", "")
	var catalog struct {
		Data LearningCourseResponse `json:"data"`
	}
	if err := json.Unmarshal(got.Body.Bytes(), &catalog); err != nil {
		t.Fatal(err)
	}
	if got.Code != http.StatusOK || len(catalog.Data.Lessons) != 75 {
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
		if got := request(t, router, 1, http.MethodPost, "/learning/lesson-attempts", string(body)); got.Code != http.StatusBadRequest {
			t.Fatalf("invalid: %d %s", got.Code, got.Body)
		}
	}
	if got := request(t, router, 0, http.MethodPost, "/learning/lesson-attempts", "{}"); got.Code != http.StatusUnauthorized {
		t.Fatal("unauthenticated write")
	}
}
