package learning

import (
	"encoding/json"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/learningview"
	"github.com/google/uuid"
)

func TestTopicPracticeGradingIsolationRetryAndMastery(t *testing.T) {
	router := testRouter(t)
	call := func(user uint, method, path, body string, status int) *httptest.ResponseRecorder {
		t.Helper()
		response := request(t, router, user, method, path, body, "student")
		if response.Code != status {
			t.Fatalf("%s %s: %d %s", method, path, response.Code, response.Body)
		}
		return response
	}
	concept := "topic:time-constant"
	path := "/learning/practice-bank?conceptId=" + url.QueryEscape(concept)
	call(0, "GET", path, "", 401)
	call(0, "POST", "/learning/practice-attempts", `{}`, 401)
	call(1, "GET", "/learning/practice-bank?conceptId=missing", "", 400)
	bank := domain.FindPracticeBank(concept, "zh-CN")
	first := call(1, "GET", path, "", 200)
	for _, secret := range []string{`"answer"`, `"expected"`, `"explanation"`} {
		if strings.Contains(first.Body.String(), secret) {
			t.Fatalf("bank leaked %s", secret)
		}
	}
	var initial struct{ Data LearningPracticeBankResponse }
	if err := json.Unmarshal(first.Body.Bytes(), &initial); err != nil {
		t.Fatal(err)
	}
	if len(initial.Data.Questions) < 10 || len(initial.Data.Progress) != 0 {
		t.Fatal("missing questions or unexpected progress")
	}
	q := bank.Questions[0]
	bodyFor := func(id, conceptID, questionID, value string) string {
		body, _ := json.Marshal(map[string]any{"id": id, "conceptId": conceptID, "questionId": questionID, "locale": "zh-CN", "answers": map[string]string{"choice": value}, "userId": 2, "correct": true})
		return string(body)
	}
	id := uuid.NewString()
	body := bodyFor(id, concept, q.ID, strconv.Itoa((q.Answer+1)%4))
	saved := call(1, "POST", "/learning/practice-attempts", body, 200)
	var graded struct{ Data LearningLessonAttemptResponse }
	if err := json.Unmarshal(saved.Body.Bytes(), &graded); err != nil {
		t.Fatal(err)
	}
	if graded.Data.Score != 0 || graded.Data.Explanation == "" {
		t.Fatal("answer was not graded on the server")
	}
	if retry := call(1, "POST", "/learning/practice-attempts", body, 200); retry.Body.String() != saved.Body.String() {
		t.Fatal("retry changed saved attempt")
	}
	call(1, "POST", "/learning/practice-attempts", bodyFor(id, concept, q.ID, strconv.Itoa(q.Answer)), 409)
	call(1, "POST", "/learning/practice-attempts", bodyFor(uuid.NewString(), "lesson:ss-2-8", q.ID, "0"), 400)
	readProgress := func(user uint) LearningPracticeBankResponse {
		t.Helper()
		var env struct{ Data LearningPracticeBankResponse }
		response := call(user, "GET", path, "", 200)
		if response.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("personal bank cached")
		}
		if err := json.Unmarshal(response.Body.Bytes(), &env); err != nil {
			t.Fatal(err)
		}
		return env.Data
	}
	if len(readProgress(1).Progress) != 1 || len(readProgress(2).Progress) != 0 {
		t.Fatal("retry duplicated progress or progress leaked")
	}
	mastery := func(id string) learningview.LearningMasteryConceptResponse {
		t.Helper()
		var env struct {
			Data learningview.LearningMasteryResponse
		}
		if err := json.Unmarshal(call(1, "GET", "/learning/mastery", "", 200).Body.Bytes(), &env); err != nil {
			t.Fatal(err)
		}
		for _, item := range env.Data.Concepts {
			if item.ID == id {
				return item
			}
		}
		t.Fatalf("missing concept %s", id)
		return learningview.LearningMasteryConceptResponse{}
	}
	if mastery(concept).Status != "weak" {
		t.Fatal("wrong answer did not update mastery")
	}
	call(1, "POST", "/learning/practice-attempts", bodyFor(uuid.NewString(), concept, q.ID, strconv.Itoa(q.Answer)), 200)
	if got := mastery(concept); got.Status != "developing" || got.Questions != 1 {
		t.Fatal("repeating one question inflated mastery")
	}
	// The old quiz and new bank share canonical evidence IDs.
	old, _ := json.Marshal(map[string]any{"id": uuid.NewString(), "questionId": q.CanonicalID, "selected": q.Answer})
	call(1, "POST", "/learning/attempts", string(old), 200)
	if mastery(concept).Questions != 1 {
		t.Fatal("same question counted twice across practice entry points")
	}
	q2 := bank.Questions[1]
	call(1, "POST", "/learning/practice-attempts", bodyFor(uuid.NewString(), concept, q2.ID, strconv.Itoa(q2.Answer)), 200)
	if mastery(concept).Status != "secure" {
		t.Fatal("distinct correct answers did not improve mastery")
	}
	// Numeric standalone practice is accessible without exposing classroom questions.
	numeric := domain.FindPracticeBank("lesson:ss-2-8", "en-US").Questions[0]
	numericBody, _ := json.Marshal(LearningPracticeAnswerRequest{ID: uuid.NewString(), ConceptID: "lesson:ss-2-8", QuestionID: numeric.ID, Locale: "en-US", Answers: map[string]string{"value": "4/2"}})
	call(1, "POST", "/learning/practice-attempts", string(numericBody), 200)
	if got := mastery("lesson:ss-2-8"); got.Status != "developing" || got.Correct != 1 {
		t.Fatal("numeric practice did not update the course concept")
	}
	call(1, "POST", "/learning/practice-attempts", strings.Replace(string(numericBody), "4/2", "not-a-number", 1), 400)
	call(1, "GET", "/learning/question-bank", "", 403)
	call(1, "POST", "/learning/lesson-attempts", `{}`, 403)
}
