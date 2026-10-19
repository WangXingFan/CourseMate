package learning

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	repo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/pkg/token"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestLearningProgressIsolationRetryAndRecovery(t *testing.T) {
	router := testRouter(t)
	id := uuid.NewString()
	body := fmt.Sprintf(`{"id":%q,"questionId":"energy-signal","selected":1,"userId":2,"correct":true}`, id)
	first := request(t, router, 1, http.MethodPost, "/learning/attempts", body)
	if first.Code != http.StatusOK {
		t.Fatalf("submit: %d %s", first.Code, first.Body)
	}
	var original struct {
		Data LearningAttemptData `json:"data"`
	}
	if err := json.Unmarshal(first.Body.Bytes(), &original); err != nil {
		t.Fatal(err)
	}
	if original.Data.Attempt.Correct {
		t.Fatal("client-supplied correctness was trusted")
	}
	retry := request(t, router, 1, http.MethodPost, "/learning/attempts", body)
	if retry.Code != http.StatusOK || retry.Body.String() != first.Body.String() {
		t.Fatalf("retry changed the record: %s", retry.Body)
	}
	conflict := request(t, router, 1, http.MethodPost, "/learning/attempts", strings.Replace(body, `"selected":1`, `"selected":0`, 1))
	if conflict.Code != http.StatusConflict {
		t.Fatalf("conflict: %d %s", conflict.Code, conflict.Body)
	}
	other := progress(t, router, 2)
	if len(other.Recent) != 0 || other.Questions[0].Attempts != 0 {
		t.Fatal("progress leaked across accounts")
	}
	// An identical request ID in another account is a distinct practice attempt.
	if result := request(t, router, 2, http.MethodPost, "/learning/attempts", body); result.Code != http.StatusOK {
		t.Fatal(result.Body.String())
	}
	view := progress(t, router, 1)
	if len(view.Recent) != 1 || view.Questions[0].Attempts != 1 || view.Questions[0].CorrectCount != 0 {
		t.Fatalf("duplicate was counted: %+v", view)
	}
	recovery := fmt.Sprintf(`{"id":%q,"questionId":"energy-signal","selected":0}`, uuid.NewString())
	if result := request(t, router, 1, http.MethodPost, "/learning/attempts", recovery); result.Code != http.StatusOK {
		t.Fatal(result.Body.String())
	}
	view = progress(t, router, 1)
	question := view.Questions[0]
	if question.Attempts != 2 || question.CorrectCount != 1 || question.Latest == nil || !question.Latest.Correct {
		t.Fatalf("recovery lost mistake history: %+v", question)
	}
	if len(view.Recent) != 2 || !view.Recent[0].Correct || view.Recent[1].Correct {
		t.Fatalf("history order: %+v", view.Recent)
	}
	if question.LatestWrong == nil || question.Misconception != "energy-signal-power" || question.NextReviewAt == nil {
		t.Fatal("correct quiz erased diagnosis or review schedule")
	}
}

func TestVariantReviewWorkflowAndIsolation(t *testing.T) {
	router := testRouter(t)
	for _, path := range []string{"/learning/variants/energy-signal-v1", "/learning/tutor", "/learning/reviews"} {
		method := http.MethodPost
		if strings.Contains(path, "/variants/") {
			method = http.MethodGet
		}
		if result := request(t, router, 0, method, path, `{}`); result.Code != http.StatusUnauthorized {
			t.Fatalf("anonymous %s: %d", path, result.Code)
		}
	}
	variant := request(t, router, 1, http.MethodGet, "/learning/variants/energy-signal-v1?locale=zh-CN", "")
	if variant.Code != http.StatusOK || strings.Contains(variant.Body.String(), `"answer"`) || strings.Contains(variant.Body.String(), `"explanation"`) || !strings.Contains(variant.Body.String(), "总能量") {
		t.Fatalf("variant leaked or missing translation: %s", variant.Body)
	}
	body := fmt.Sprintf(`{"id":%q,"baseQuestionId":"energy-signal","variantId":"energy-signal-v1","selected":0,"locale":"zh-CN"}`, uuid.NewString())
	if result := request(t, router, 2, http.MethodPost, "/learning/reviews", body); result.Code != http.StatusBadRequest {
		t.Fatal("review accessed another student's mistake")
	}
	wrong := fmt.Sprintf(`{"id":%q,"questionId":"energy-signal","selected":1}`, uuid.NewString())
	if result := request(t, router, 1, http.MethodPost, "/learning/attempts", wrong); result.Code != http.StatusOK {
		t.Fatal(result.Body.String())
	}
	first := request(t, router, 1, http.MethodPost, "/learning/reviews", body)
	if first.Code != http.StatusOK {
		t.Fatalf("review: %d %s", first.Code, first.Body)
	}
	var envelope struct {
		Data LearningAttemptData `json:"data"`
	}
	if err := json.Unmarshal(first.Body.Bytes(), &envelope); err != nil {
		t.Fatal(err)
	}
	if !envelope.Data.Attempt.Correct || envelope.Data.Attempt.ReviewStage != 1 || envelope.Data.Explanation == "" {
		t.Fatalf("review result: %+v", envelope.Data)
	}
	retry := request(t, router, 1, http.MethodPost, "/learning/reviews", body)
	if retry.Code != http.StatusOK || retry.Body.String() != first.Body.String() {
		t.Fatal("review retry changed result")
	}
	for _, changed := range []string{strings.Replace(body, `"selected":0`, `"selected":1`, 1), strings.Replace(body, "energy-signal-v1", "energy-signal-v2", 1)} {
		if result := request(t, router, 1, http.MethodPost, "/learning/reviews", changed); result.Code != http.StatusConflict {
			t.Fatalf("conflict: %d %s", result.Code, result.Body)
		}
	}
	view := progress(t, router, 1)
	if len(view.Recent) != 2 || view.Questions[0].ReviewStage != 1 || view.Questions[0].LatestWrong.Selected != 1 || view.Recent[0].Mode != "review" {
		t.Fatalf("progress: %+v", view)
	}
	if len(progress(t, router, 2).Recent) != 0 {
		t.Fatal("review history leaked")
	}
}

func TestTutorHTTPValidation(t *testing.T) {
	router := testRouter(t)
	for _, body := range []string{
		`{"experimentId":"unknown","action":"hint"}`,
		`{"experimentId":"signal-basics","action":"hint","parameters":{"x":{"nested":1}}}`,
		`{"experimentId":"signal-basics","action":"hint","parameters":{"x":[1]}}`,
	} {
		if result := request(t, router, 1, http.MethodPost, "/learning/tutor", body); result.Code != http.StatusBadRequest {
			t.Fatalf("accepted invalid context: %d %s", result.Code, result.Body)
		}
	}
	result := request(t, router, 1, http.MethodPost, "/learning/tutor", `{"experimentId":"signal-basics","action":"hint","locale":"zh-CN","parameters":{"amplitude":2,"reversed":false}}`)
	if result.Code != http.StatusOK || !strings.Contains(result.Body.String(), `"source":"curated"`) || result.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("tutor: %d %s", result.Code, result.Body)
	}
}

func TestLearningValidationAndHistoryLimit(t *testing.T) {
	router := testRouter(t)
	if result := request(t, router, 0, http.MethodGet, "/learning/progress", ""); result.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated: %d", result.Code)
	}
	for _, body := range []string{
		`{}`, `{"id":"bad","questionId":"energy-signal","selected":0}`,
		fmt.Sprintf(`{"id":%q,"questionId":"energy-signal"}`, uuid.NewString()),
		fmt.Sprintf(`{"id":%q,"questionId":"energy-signal","selected":-1}`, uuid.NewString()),
		fmt.Sprintf(`{"id":%q,"questionId":"energy-signal","selected":4}`, uuid.NewString()),
		fmt.Sprintf(`{"id":%q,"questionId":"unknown","selected":0}`, uuid.NewString()),
		`{"id":"00000000-0000-0000-0000-000000000000","questionId":"energy-signal","selected":0}`,
	} {
		if result := request(t, router, 1, http.MethodPost, "/learning/attempts", body); result.Code != http.StatusBadRequest {
			t.Fatalf("accepted %s: %d %s", body, result.Code, result.Body)
		}
	}
	for i := 0; i < 45; i++ {
		body := fmt.Sprintf(`{"id":%q,"questionId":"energy-signal","selected":0}`, uuid.NewString())
		if result := request(t, router, 1, http.MethodPost, "/learning/attempts", body); result.Code != http.StatusOK {
			t.Fatal(result.Body.String())
		}
	}
	view := progress(t, router, 1)
	if len(view.Recent) != 40 || view.Questions[0].Attempts != 45 || view.Questions[0].CorrectCount != 45 {
		t.Fatalf("bounded history truncated totals: %+v", view)
	}
}

func testRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "learning.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.AutoMigrate(&models.LearningAttempt{}, &models.LearningLessonAttempt{}); err != nil {
		t.Fatal(err)
	}
	router := gin.New()
	group := router.Group("/api/v1", middleware.AuthMiddleware("learning-test", nil))
	NewModule(app.NewService(repo.NewRepo(db))).RegisterRoutes(group)
	return router
}

func request(t *testing.T, router *gin.Engine, userID uint, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, "/api/v1"+path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if userID != 0 {
		accessToken, err := token.GenerateWithClaims(token.GenerateClaimsInput{Secret: "learning-test", UserID: userID, TTL: time.Hour})
		if err != nil {
			t.Fatal(err)
		}
		req.Header.Set("Authorization", "Bearer "+accessToken)
	}
	result := httptest.NewRecorder()
	router.ServeHTTP(result, req)
	return result
}

func progress(t *testing.T, router *gin.Engine, userID uint) LearningProgressResponse {
	t.Helper()
	result := request(t, router, userID, http.MethodGet, "/learning/progress", "")
	if result.Code != http.StatusOK {
		t.Fatalf("progress: %d %s", result.Code, result.Body)
	}
	if result.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("personal progress must not be cached")
	}
	var envelope struct {
		Data LearningProgressResponse `json:"data"`
	}
	if err := json.Unmarshal(result.Body.Bytes(), &envelope); err != nil {
		t.Fatal(err)
	}
	if len(envelope.Data.Questions) != 12 {
		t.Fatalf("catalog: %+v", envelope.Data.Questions)
	}
	if envelope.Data.AccountID != userID {
		t.Fatalf("progress owner = %d, want %d", envelope.Data.AccountID, userID)
	}
	return envelope.Data
}
