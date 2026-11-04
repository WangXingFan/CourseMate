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

func TestVirtualLabPhaseTwoVersionsAndArchives(t *testing.T) {
	for _, name := range []string{"virtual-lab.json", "virtual-lab-v1.1.json", "virtual-lab-migrated.json", "virtual-lab-v1.2.json", "virtual-lab-v1.2-migrated.json"} {
		t.Run(name, func(t *testing.T) {
			document, err := os.ReadFile("testdata/" + name)
			if err != nil {
				t.Fatal(err)
			}
			if err := ValidateVirtualLab(string(document)); err != nil {
				t.Fatal(err)
			}
			var raw map[string]any
			if err := json.Unmarshal(document, &raw); err != nil {
				t.Fatal(err)
			}
			tasks := raw["tasks"].(map[string]any)
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
			if raw["appVersion"] == "1.0.0" {
				// Historical Python snapshots use the historical answer schema.
				item := tasks["L3-3"].(map[string]any)
				item["python"] = map[string]any{"code": "print(1)", "result": map[string]any{"code": "print(1)", "params": item["params"], "time": raw["updatedAt"], "stdout": "1", "stderr": "", "plots": []any{}}}
				check(true)
				return
			}
			params := tasks["L2-4"].(map[string]any)["params"].(map[string]any)
			params["mode"] = "audio"
			check(false)
			params["fs"] = "4000"
			check(true)
			answers := tasks["L1-2"].(map[string]any)["answers"].(map[string]any)
			answers["evidence"] = "x1=step; x2=step; alpha=1; beta=1"
			check(true)
			answers["evidence"] = strings.Repeat("x", 101)
			check(false)
			answers["evidence"] = ""
			if archive, exists := raw["phaseTwoArchive"]; exists {
				params := archive.(map[string]any)["tasks"].(map[string]any)["L3-3"].(map[string]any)["params"].(map[string]any)
				previous := params["zeta"]
				params["zeta"] = 9.0
				check(false)
				params["zeta"] = previous
				check(true)
			}
			if archive, exists := raw["legacyArchive"]; exists {
				archived := archive.(map[string]any)["tasks"].(map[string]any)
				archived["L3-3"].(map[string]any)["params"].(map[string]any)["initial"] = "invalid"
				check(false)
			}
		})
	}
}
