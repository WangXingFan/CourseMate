package learning

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/pkg/token"
)

func labDocument(t *testing.T, text string) string {
	t.Helper()
	specJSON, err := os.ReadFile("../../../domain/learning/content/virtual-lab-task-specs.json")
	if err != nil {
		t.Fatal(err)
	}
	var specs map[string]struct {
		Params  map[string]struct{ Default any }
		Answers []string
	}
	if err := json.Unmarshal(specJSON, &specs); err != nil {
		t.Fatal(err)
	}
	tasks := map[string]any{}
	for c := 1; c <= 3; c++ {
		for n := 1; n <= 4; n++ {
			id := fmt.Sprintf("L%d-%d", c, n)
			params, answers := map[string]any{}, map[string]any{}
			for key, param := range specs[id].Params {
				params[key] = param.Default
			}
			for _, key := range specs[id].Answers {
				answers[key] = ""
			}
			tasks[id] = map[string]any{"taskId": id, "experimentId": id[:2], "params": params, "answers": answers,
				"prediction": text, "predictionDraft": "", "derivation": "", "analysis": "", "trials": []any{}, "figures": []any{}, "revisions": []any{},
				"completion": map[string]any{"confirmed": false, "confirmedAt": nil}}
		}
	}
	data, err := json.Marshal(map[string]any{"schemaVersion": 2, "appVersion": "1.0.0", "createdAt": time.Now().UTC().Format(time.RFC3339),
		"updatedAt": time.Now().UTC().Format(time.RFC3339), "student": map[string]string{"name": "", "number": "", "classroom": ""}, "tasks": tasks})
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func labBody(document string, revision int) string {
	data, _ := json.Marshal(map[string]any{"revision": revision, "document": document, "userId": 999})
	return string(data)
}

func TestVirtualLabAuthenticationIsolationConflictAndRetry(t *testing.T) {
	router := testRouter(t)
	const path = "/learning/virtual-lab"
	for _, method := range []string{http.MethodGet, http.MethodPut} {
		if r := request(t, router, 0, method, path, "{}"); r.Code != 401 {
			t.Fatalf("anonymous: %d", r.Code)
		}
	}
	document := labDocument(t, "original")
	first := request(t, router, 1, http.MethodPut, path, labBody(document, 0))
	if first.Code != 200 {
		t.Fatalf("save: %d %s", first.Code, first.Body)
	}
	retry := request(t, router, 1, http.MethodPut, path, labBody(document, 0))
	if retry.Code != 200 || retry.Body.String() != first.Body.String() {
		t.Fatalf("lost-response retry changed record: %s", retry.Body)
	}
	var env struct{ Data LearningVirtualLabResponse }
	read := request(t, router, 1, http.MethodGet, path, "")
	if err := json.Unmarshal(read.Body.Bytes(), &env); err != nil {
		t.Fatal(err)
	}
	if env.Data.AccountID != 1 || env.Data.Document != document || env.Data.Revision != 1 || read.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("record was not restored")
	}
	for _, other := range []uint{2, 999} {
		result := request(t, router, other, http.MethodGet, path, "")
		if err := json.Unmarshal(result.Body.Bytes(), &env); err != nil {
			t.Fatal(err)
		}
		if env.Data.Document != "" || env.Data.Revision != 0 {
			t.Fatal("record crossed account boundary")
		}
	}
	next := labDocument(t, "second tab")
	if r := request(t, router, 1, http.MethodPut, path, labBody(next, 0)); r.Code != 409 {
		t.Fatalf("stale save: %d", r.Code)
	}
	if r := request(t, router, 1, http.MethodPut, path, labBody(next, 1)); r.Code != 200 {
		t.Fatal(r.Body)
	}
	if r := request(t, router, 1, http.MethodPut, path, labBody(document, 1)); r.Code != 409 {
		t.Fatal("stale update overwrote evidence")
	}
	invalidParams := strings.Replace(next, `"a":1`, `"a":0`, 1)
	if invalidParams == next {
		t.Fatal("invalid parameter fixture did not change")
	}
	if r := request(t, router, 1, http.MethodPut, path, labBody(invalidParams, 2)); r.Code != 400 {
		t.Fatal("zero time scaling was accepted")
	}
	for _, bad := range []string{`{"revision":2,"document":"{}"}`, `{"document":"{}"}`, labBody(labDocument(t, strings.Repeat("x", 12001)), 2), labBody(strings.Repeat("x", 20*1024*1024+1), 2)} {
		if r := request(t, router, 1, http.MethodPut, path, bad); r.Code != 400 {
			t.Fatalf("invalid accepted: %d", r.Code)
		}
	}
	read = request(t, router, 1, http.MethodGet, path, "")
	if err := json.Unmarshal(read.Body.Bytes(), &env); err != nil {
		t.Fatal(err)
	}
	if env.Data.Document != next || env.Data.Revision != 2 {
		t.Fatal("invalid request damaged evidence")
	}
}

func TestVirtualLabPythonSaveRestoreAndIsolation(t *testing.T) {
	router := testRouter(t)
	var snapshot map[string]any
	if err := json.Unmarshal([]byte(labDocument(t, "Python comparison")), &snapshot); err != nil {
		t.Fatal(err)
	}
	task := snapshot["tasks"].(map[string]any)["L1-1"].(map[string]any)
	task["python"] = map[string]any{"code": "print(2)", "result": map[string]any{
		"code": "print(1)", "params": task["params"], "time": snapshot["updatedAt"], "stdout": "1\n", "stderr": "",
		"plots": []any{[]any{"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="}},
	}}
	encoded, err := json.Marshal(snapshot)
	if err != nil {
		t.Fatal(err)
	}
	const path = "/learning/virtual-lab"
	if response := request(t, router, 1, http.MethodPut, path, labBody(string(encoded), 0)); response.Code != 200 {
		t.Fatalf("save: %d %s", response.Code, response.Body)
	}
	var envelope struct{ Data LearningVirtualLabResponse }
	response := request(t, router, 1, http.MethodGet, path, "")
	if err := json.Unmarshal(response.Body.Bytes(), &envelope); err != nil {
		t.Fatal(err)
	}
	if envelope.Data.Document != string(encoded) {
		t.Fatal("Python draft, source, outputs or PNG snapshot changed after storage")
	}
	response = request(t, router, 2, http.MethodGet, path, "")
	if err := json.Unmarshal(response.Body.Bytes(), &envelope); err != nil {
		t.Fatal(err)
	}
	if envelope.Data.Document != "" {
		t.Fatal("Python evidence crossed account boundary")
	}
}

func TestVirtualLabGuideRoles(t *testing.T) {
	router := testRouter(t)
	for role, want := range map[string]int{"student": 403, "user": 403, "teacher": 200, "admin": 200, "superadmin": 200} {
		value, err := token.GenerateWithClaims(token.GenerateClaimsInput{Secret: "learning-test", UserID: 1, Role: role, TTL: time.Hour})
		if err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(http.MethodGet, "/api/v1/learning/virtual-lab/guide", nil)
		req.Header.Set("Authorization", "Bearer "+value)
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)
		if res.Code != want {
			t.Fatalf("%s: %d %s", role, res.Code, res.Body)
		}
		if want == 200 {
			var env struct {
				Data LearningVirtualLabGuideResponse
			}
			_ = json.Unmarshal(res.Body.Bytes(), &env)
			if strings.Count(env.Data.HTML, "教师参考：") != 12 || strings.Contains(env.Data.HTML, "信号与系统虚拟实验室/index.html") {
				t.Fatal("guide incomplete or stale link")
			}
		}
	}
}
