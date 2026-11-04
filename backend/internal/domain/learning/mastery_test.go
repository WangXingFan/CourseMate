package learning

import (
	"testing"
	"time"
)

func TestMasteryUsesRecentDistinctEvidenceAndAllowsRecovery(t *testing.T) {
	now := time.Date(2026, 11, 4, 12, 0, 0, 0, time.UTC)
	concept := "topic:" + Questions()[0].Topic
	evidence := func(question string, correct bool, days int) MasteryEvidence {
		return MasteryEvidence{ConceptID: concept, QuestionID: question, Correct: correct, At: now.AddDate(0, 0, -days)}
	}
	for _, tc := range []struct {
		name, status string
		items        []MasteryEvidence
		questions    int
	}{
		{"no evidence", "unassessed", nil, 0},
		{"expired", "unassessed", []MasteryEvidence{evidence("a", false, 91)}, 0},
		{"future", "unassessed", []MasteryEvidence{evidence("a", true, -1)}, 0},
		{"wrong", "weak", []MasteryEvidence{evidence("a", false, 0)}, 1},
		{"repeat is one question", "developing", []MasteryEvidence{evidence("a", true, 2), evidence("a", true, 1), evidence("a", true, 0)}, 1},
		{"correction replaces wrong", "developing", []MasteryEvidence{evidence("a", false, 2), evidence("a", true, 1)}, 1},
		{"two distinct correct", "secure", []MasteryEvidence{evidence("a", false, 3), evidence("b", true, 1), evidence("a", true, 0)}, 2},
		{"regression", "weak", []MasteryEvidence{evidence("a", true, 2), evidence("b", true, 1), evidence("a", false, 0)}, 2},
		{"mixed simultaneous", "weak", []MasteryEvidence{evidence("a", true, 0), evidence("b", false, 0)}, 2},
	} {
		t.Run(tc.name, func(t *testing.T) {
			profile := BuildMastery(tc.items, now)
			for _, item := range profile.Concepts {
				if item.ID == concept {
					if item.Status != tc.status || item.Questions != tc.questions {
						t.Fatalf("got %s/%d want %s/%d", item.Status, item.Questions, tc.status, tc.questions)
					}
				}
			}
			if profile.Counts.Total != len(profile.Concepts) || profile.Counts.Assessed > 1 {
				t.Fatal("incorrect counts")
			}
		})
	}
	p := BuildMastery([]MasteryEvidence{evidence("a", true, 0), evidence("a", true, 0)}, now)
	if p.Weeks[5].Answers != 2 || p.Weeks[5].Correct != 2 {
		t.Fatal("weekly activity should include repeated answers")
	}
}
