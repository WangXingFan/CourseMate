package classroom

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
)

func TestActivityStagesNumericGradingAndFollowupRules(t *testing.T) {
	router, _ := newClassroomHandlerTest(t)
	for _, phase := range []string{"pre_class", "in_class", "after_class"} {
		result := performClassroomRequest(router, http.MethodGet, "/api/v1/classrooms/class_one/quiz-lessons?phase="+phase, "", 0)
		var catalog struct {
			Data QuizLessonListResponse `json:"data"`
		}
		if err := json.Unmarshal(result.Body.Bytes(), &catalog); err != nil || result.Code != 200 || len(catalog.Data.Lessons) != 52 {
			t.Fatalf("catalog %s: %s %v", phase, result.Body, err)
		}
		for _, lesson := range catalog.Data.Lessons {
			if (lesson.Followup != nil) != (phase != "after_class") {
				t.Fatalf("followup availability %s %s", phase, lesson.ID)
			}
		}
	}
	if res := performClassroomRequest(router, http.MethodGet, "/api/v1/classrooms/class_one/quiz-lessons?phase=bogus", "", 0); res.Code != 400 {
		t.Fatal("unknown phase accepted")
	}
	if res := performClassroomRequest(router, http.MethodGet, "/api/v1/classrooms/class_one/quiz-lessons?phase=in_class", "", 4); res.Code != 403 {
		t.Fatal("student read answer catalog")
	}

	created := performClassroomRequest(router, http.MethodPost, "/api/v1/classrooms/class_one/quizzes", `{"title":"课中计算","phase":"in_class","lessonIds":["ss-1-1","ss-1-4"]}`, 0)
	var data struct {
		Data QuizDataResponse `json:"data"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &data); err != nil || created.Code != 200 {
		t.Fatalf("create: %s %v", created.Body, err)
	}
	quiz := data.Data.Quiz
	if quiz.Phase != "in_class" || quiz.Questions[0].Fields[0].Expected != 2.25 {
		t.Fatalf("wrong stage: %+v", quiz)
	}
	path := "/api/v1/quizzes/" + quiz.ID
	if res := performClassroomRequest(router, http.MethodPost, path+"/open", "", 0); res.Code != 200 {
		t.Fatal(res.Body)
	}
	student := performClassroomRequest(router, http.MethodGet, "/api/v1/student/quizzes", "", 4)
	for _, key := range []string{`"expected":`, `"answer":`, `"explanation":`, `"followup":`} {
		if strings.Contains(student.Body.String(), key) {
			t.Fatalf("leaked %s", key)
		}
	}
	payload := `{"answers":[-1,2],"fieldAnswers":{"ss-1-1-in_class-v1":{"f1":"1/0"}}}`
	if res := performClassroomRequest(router, http.MethodPost, path+"/submissions", payload, 4); res.Code != 400 {
		t.Fatal("invalid numeric input accepted")
	}
	payload = strings.ReplaceAll(payload, "1/0", "9/4")
	if res := performClassroomRequest(router, http.MethodPost, path+"/submissions", payload, 4); res.Code != 200 || !strings.Contains(res.Body.String(), `"score":2`) {
		t.Fatalf("fraction grading: %s", res.Body)
	}
	if res := performClassroomRequest(router, http.MethodPost, path+"/submissions", payload, 4); res.Code != 409 {
		t.Fatal("duplicate submission accepted")
	}
	if res := performClassroomRequest(router, http.MethodPost, path+"/close", "", 0); res.Code != 200 {
		t.Fatal(res.Body)
	}
	followup := performClassroomRequest(router, http.MethodPost, path+"/followup", "", 0)
	data.Data.Quiz = QuizResponse{}
	if err := json.Unmarshal(followup.Body.Bytes(), &data); err != nil || followup.Code != 200 {
		t.Fatalf("followup %s %v", followup.Body, err)
	}
	next := data.Data.Quiz
	if next.SourceQuizID != quiz.ID || next.Questions[0].Prompt == quiz.Questions[0].Prompt {
		t.Fatal("missing distinct in-class variant")
	}
	nextPath := "/api/v1/quizzes/" + next.ID
	if res := performClassroomRequest(router, http.MethodPost, nextPath+"/followup", "", 0); res.Code != 400 {
		t.Fatal("retest can create another retest")
	}
	if res := performClassroomRequest(router, http.MethodPost, nextPath+"/open", "", 0); res.Code != 200 {
		t.Fatal(res.Body)
	}
	payload = fmt.Sprintf(`{"answers":[-1,%d],"fieldAnswers":{%q:{"f1":"4"}}}`, next.Questions[1].Answer, next.Questions[0].ID)
	if res := performClassroomRequest(router, http.MethodPost, nextPath+"/submissions", payload, 4); res.Code != 200 {
		t.Fatal(res.Body)
	}
	report := performClassroomRequest(router, http.MethodGet, path+"/submissions", "", 0)
	var stats struct {
		Data QuizReportResponse `json:"data"`
	}
	if err := json.Unmarshal(report.Body.Bytes(), &stats); err != nil {
		t.Fatal(err)
	}
	if stats.Data.Statistics.Questions[0].CorrectCount != 1 || stats.Data.Comparison == nil || stats.Data.Comparison.Questions[0].Retained != 1 || stats.Data.Submissions[0].FieldAnswers[quiz.Questions[0].ID]["f1"] != "9/4" {
		t.Fatalf("numeric report: %s", report.Body)
	}

	after := performClassroomRequest(router, http.MethodPost, "/api/v1/classrooms/class_one/quizzes", `{"title":"课后","phase":"after_class","lessonIds":["ss-1-1"]}`, 0)
	if err := json.Unmarshal(after.Body.Bytes(), &data); err != nil || after.Code != 200 {
		t.Fatal(after.Body)
	}
	afterPath := "/api/v1/quizzes/" + data.Data.Quiz.ID
	performClassroomRequest(router, http.MethodPost, afterPath+"/close", "", 0)
	if res := performClassroomRequest(router, http.MethodPost, afterPath+"/followup", "", 0); res.Code != 400 {
		t.Fatal("after-class retest accepted")
	}
}
