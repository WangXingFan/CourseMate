package learning

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestQuestionBankRoleGateAndResponse(t *testing.T) {
	router := testRouter(t)
	if result := request(t, router, 0, http.MethodGet, "/learning/question-bank", ""); result.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous: %d", result.Code)
	}
	for _, role := range []string{"student", "user", ""} {
		result := request(t, router, 1, http.MethodGet, "/learning/question-bank?category=homework", "", role)
		if result.Code != http.StatusForbidden || strings.Contains(result.Body.String(), "hw1-q1") {
			t.Fatalf("role %q: %d %s", role, result.Code, result.Body)
		}
	}
	for _, role := range []string{"teacher", "admin", "superadmin"} {
		result := request(t, router, 1, http.MethodGet, "/learning/question-bank?category=homework&q=hw1-q2", "", role)
		if result.Code != http.StatusOK || result.Header().Get("Cache-Control") != "no-store" {
			t.Fatalf("role %s: %d %s", role, result.Code, result.Body)
		}
		var envelope struct {
			Data QuestionBankResponse `json:"data"`
		}
		if err := json.Unmarshal(result.Body.Bytes(), &envelope); err != nil {
			t.Fatal(err)
		}
		data := envelope.Data
		if data.Total != 1 || len(data.Questions) != 1 || len(data.Categories) != 11 || data.Page != 1 || data.PageSize != 20 {
			t.Fatalf("unexpected response: %+v", data)
		}
		q := data.Questions[0]
		if q.ID != "hw1-q2" || q.Prompt == "" || q.Explanation == "" || len(q.Parts[0].Answers) == 0 {
			t.Fatalf("missing staff content: %+v", q)
		}
	}
	for _, query := range []string{"page=0", "pageSize=101", "category=unknown"} {
		result := request(t, router, 1, http.MethodGet, "/learning/question-bank?"+query, "", "teacher")
		if result.Code != http.StatusBadRequest {
			t.Fatalf("accepted %s: %d", query, result.Code)
		}
	}
}
