package learning

import (
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
