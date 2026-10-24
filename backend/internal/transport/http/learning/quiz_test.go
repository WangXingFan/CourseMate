package learning

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/google/uuid"
)

func TestChapterQuizHTTPWorkflow(t *testing.T) {
	router := testRouter(t)
	for _, path := range []string{"/learning/quiz/chapters", "/learning/quiz/leaderboard?chapterId=1"} {
		if result := request(t, router, 0, http.MethodGet, path, ""); result.Code != http.StatusUnauthorized {
			t.Fatalf("anonymous %s: %d", path, result.Code)
		}
	}
	catalog := request(t, router, 1, http.MethodGet, "/learning/quiz/chapters", "")
	var chapters struct {
		Data LearningQuizCatalogResponse `json:"data"`
	}
	if err := json.Unmarshal(catalog.Body.Bytes(), &chapters); err != nil || len(chapters.Data.Chapters) != 4 {
		t.Fatalf("catalog: %s %v", catalog.Body, err)
	}
	id := uuid.NewString()
	start := request(t, router, 1, http.MethodPost, "/learning/quiz/rounds", fmt.Sprintf(`{"id":%q,"chapterId":"1","score":9999,"elapsedMs":1,"userId":2}`, id))
	var round struct {
		Data LearningQuizRoundResponse `json:"data"`
	}
	if err := json.Unmarshal(start.Body.Bytes(), &round); err != nil || start.Code != 200 {
		t.Fatalf("start: %s %v", start.Body, err)
	}
	if round.Data.Round.Score != 0 || len(round.Data.Round.QuestionIDs) != 10 || round.Data.ServerTime == "" || strings.Contains(start.Body.String(), "userId") {
		t.Fatalf("start fields: %s", start.Body)
	}
	questionID := round.Data.Round.QuestionIDs[0]
	question := domain.FindQuestion(questionID)
	body := fmt.Sprintf(`{"questionId":%q,"selected":%d,"correct":false,"score":9999}`, questionID, question.Answer)
	url := "/learning/quiz/rounds/" + id + "/answers"
	if result := request(t, router, 2, http.MethodPost, url, body); result.Code != 400 {
		t.Fatalf("cross-account: %s", result.Body)
	}
	if result := request(t, router, 1, http.MethodPost, url, `{"questionId":"nyquist","selected":0}`); result.Code != 400 {
		t.Fatalf("cross-chapter: %s", result.Body)
	}
	answer := request(t, router, 1, http.MethodPost, url, body)
	if err := json.Unmarshal(answer.Body.Bytes(), &round); err != nil || answer.Code != 200 {
		t.Fatalf("answer: %s %v", answer.Body, err)
	}
	if round.Data.Round.Score != 10 || round.Data.Round.FinishedAt != nil || len(round.Data.Round.Answers) != 1 || !round.Data.Round.Answers[0].Correct {
		t.Fatalf("grade: %s", answer.Body)
	}
	retry := request(t, router, 1, http.MethodPost, url, body)
	if err := json.Unmarshal(retry.Body.Bytes(), &round); err != nil || round.Data.Round.Score != 10 || len(round.Data.Round.Answers) != 1 {
		t.Fatalf("retry: %s %v", retry.Body, err)
	}
	if view := progress(t, router, 1); len(view.Recent) != 1 {
		t.Fatalf("history duplicated: %+v", view.Recent)
	}
}
