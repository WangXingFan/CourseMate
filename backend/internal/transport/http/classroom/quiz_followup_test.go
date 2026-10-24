package classroom

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
)

func TestFollowupHTTPPublishingGradingAndPairedReport(t *testing.T) {
	router, _ := newClassroomHandlerTest(t)
	created := performClassroomRequest(router, http.MethodPost, "/api/v1/classrooms/class_one/quizzes", `{"title":"一个知识点","lessonIds":["ss-3-9"]}`, 0)
	var before struct {
		Data QuizDataResponse `json:"data"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &before); err != nil || created.Code != http.StatusOK {
		t.Fatalf("create: %s %v", created.Body, err)
	}
	pre := before.Data.Quiz
	path := "/api/v1/quizzes/" + pre.ID
	if result := performClassroomRequest(router, http.MethodPost, path+"/followup", "", 0); result.Code != http.StatusBadRequest {
		t.Fatal("created retest before preview closed")
	}
	if result := performClassroomRequest(router, http.MethodPost, path+"/open", "", 0); result.Code != http.StatusOK {
		t.Fatal(result.Body)
	}
	wrong := (pre.Questions[0].Answer + 1) % len(pre.Questions[0].Options)
	if result := performClassroomRequest(router, http.MethodPost, path+"/submissions", fmt.Sprintf(`{"answers":[%d]}`, wrong), 4); result.Code != http.StatusOK {
		t.Fatal(result.Body)
	}
	if result := performClassroomRequest(router, http.MethodPost, path+"/close", "", 0); result.Code != http.StatusOK {
		t.Fatal(result.Body)
	}
	if result := performClassroomRequest(router, http.MethodPost, path+"/followup", "", 4); result.Code != http.StatusForbidden {
		t.Fatal("student created retest")
	}
	if result := performClassroomRequest(router, http.MethodPost, path+"/followup", "", 3); result.Code != http.StatusForbidden {
		t.Fatal("admin bypassed teacher ownership")
	}
	postResponse := performClassroomRequest(router, http.MethodPost, path+"/followup", "", 0)
	var after struct {
		Data QuizDataResponse `json:"data"`
	}
	if err := json.Unmarshal(postResponse.Body.Bytes(), &after); err != nil || postResponse.Code != http.StatusOK {
		t.Fatalf("followup: %s %v", postResponse.Body, err)
	}
	post := after.Data.Quiz
	if post.SourceQuizID != pre.ID || post.Status != "draft" || post.Questions[0].ConceptID != pre.Questions[0].ConceptID {
		t.Fatal("bad retest snapshot or relation")
	}
	retry := performClassroomRequest(router, http.MethodPost, path+"/followup", "", 0)
	var retried struct {
		Data QuizDataResponse `json:"data"`
	}
	if err := json.Unmarshal(retry.Body.Bytes(), &retried); err != nil || retried.Data.Quiz.ID != post.ID {
		t.Fatal("duplicate followup")
	}
	if result := performClassroomRequest(router, http.MethodPost, path+"/open", "", 0); result.Code != http.StatusBadRequest {
		t.Fatal("reopened linked preview")
	}
	postPath := "/api/v1/quizzes/" + post.ID
	if result := performClassroomRequest(router, http.MethodPost, postPath+"/open", "", 0); result.Code != http.StatusOK {
		t.Fatal(result.Body)
	}
	studentView := performClassroomRequest(router, http.MethodGet, "/api/v1/student/quizzes", "", 4)
	for _, key := range []string{`"answer":`, `"explanation":`, `"followup":`} {
		if strings.Contains(studentView.Body.String(), key) {
			t.Fatalf("student leaked %s", key)
		}
	}
	if result := performClassroomRequest(router, http.MethodPost, postPath+"/submissions", fmt.Sprintf(`{"answers":[%d]}`, post.Questions[0].Answer), 4); result.Code != http.StatusOK {
		t.Fatal(result.Body)
	}
	if result := performClassroomRequest(router, http.MethodPost, postPath+"/close", "", 0); result.Code != http.StatusOK {
		t.Fatal(result.Body)
	}
	report := performClassroomRequest(router, http.MethodGet, path+"/submissions", "", 0)
	var result struct {
		Data QuizReportResponse `json:"data"`
	}
	if err := json.Unmarshal(report.Body.Bytes(), &result); err != nil || result.Data.Comparison == nil {
		t.Fatalf("comparison: %s %v", report.Body, err)
	}
	c := result.Data.Comparison
	if c.PairedCount != 1 || len(c.Questions) != 1 || c.Questions[0].BeforeCorrect != 0 || c.Questions[0].AfterCorrect != 1 || c.Questions[0].Improved != 1 || c.AfterStatus != "closed" {
		t.Fatalf("comparison mismatch: %+v", c)
	}
}
