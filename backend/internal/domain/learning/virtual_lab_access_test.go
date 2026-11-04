package learning

import (
	"encoding/json"
	"os"
	"testing"
)

func TestClosedCourseEvidenceSurvivesMigration(t *testing.T) {
	read := func(name string) string {
		t.Helper()
		data, err := os.ReadFile("testdata/" + name)
		if err != nil {
			t.Fatal(err)
		}
		return string(data)
	}
	closed := map[string]bool{}
	for _, pair := range [][2]string{{"virtual-lab.json", "virtual-lab-migrated.json"}, {"virtual-lab-v1.1.json", "virtual-lab-access-migrated.json"}} {
		before, after := read(pair[0]), read(pair[1])
		if !VirtualLabChangesAllowed(before, after, closed) {
			t.Fatalf("migration changed closed evidence: %v", pair)
		}
		var document map[string]any
		if err := json.Unmarshal([]byte(after), &document); err != nil {
			t.Fatal(err)
		}
		document["tasks"].(map[string]any)["L2-1"].(map[string]any)["analysis"] = "changed"
		changed, _ := json.Marshal(document)
		if VirtualLabChangesAllowed(before, string(changed), closed) {
			t.Fatal("closed task was editable")
		}
		if !VirtualLabChangesAllowed(before, string(changed), map[string]bool{"L2": true}) {
			t.Fatal("open task was not editable")
		}
	}
}
