package learning

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func TestVirtualLabAcceptsShippedEngineEvidenceAndRejectsCorruption(t *testing.T) {
	// Captured from all twelve shipped calculation scenes with default parameters.
	document, err := os.ReadFile("testdata/virtual-lab.json")
	if err != nil {
		t.Fatal(err)
	}
	if err := ValidateVirtualLab(string(document)); err != nil {
		t.Fatalf("engine snapshot rejected: %v", err)
	}
	for _, pair := range [][2]string{
		{`"a": 1`, `"a": 0`},
		{`"time": "s"`, `"time": "ms"`},
		{`"K": "1"`, `"K": "99"`},
		{`"C": ""`, `"C": "NaN"`},
	} {
		corrupt := strings.Replace(string(document), pair[0], pair[1], 1)
		if corrupt == string(document) {
			t.Fatalf("fixture did not change: %s", pair[0])
		}
		if ValidateVirtualLab(corrupt) == nil {
			t.Fatalf("corrupt snapshot accepted: %s", pair[1])
		}
	}
}

func TestVirtualLabPythonEvidence(t *testing.T) {
	document, err := os.ReadFile("testdata/virtual-lab.json")
	if err != nil {
		t.Fatal(err)
	}
	var raw map[string]any
	if err := json.Unmarshal(document, &raw); err != nil {
		t.Fatal(err)
	}
	task := raw["tasks"].(map[string]any)["L1-1"].(map[string]any)
	result := map[string]any{
		"code": "print(1)", "params": task["params"], "time": raw["updatedAt"], "stdout": "1\n", "stderr": "",
		"plots": []any{[]any{"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="}},
	}
	python := map[string]any{"code": "print(2)", "result": result}
	task["python"] = python
	check := func(wantValid bool) {
		t.Helper()
		encoded, err := json.Marshal(raw)
		if err != nil {
			t.Fatal(err)
		}
		if err := ValidateVirtualLab(string(encoded)); (err == nil) != wantValid {
			t.Fatalf("valid=%v, error=%v", wantValid, err)
		}
	}
	check(true)
	for key, bad := range map[string]any{"code": strings.Repeat("x", 12001), "time": "yesterday", "plots": []any{[]any{"<svg/>"}}, "params": map[string]any{"a": 0}} {
		previous := result[key]
		result[key] = bad
		check(false)
		result[key] = previous
	}
	python["result"] = nil
	check(true)
	delete(task, "python")
	check(true)
}
