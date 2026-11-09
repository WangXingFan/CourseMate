package learning

import (
	"math"
	"net/url"
	"testing"
)

func TestEveryMasteryConceptHasAtLeastTenPracticeQuestions(t *testing.T) {
	for _, concept := range masteryCatalog() {
		for _, locale := range []string{"zh-CN", "en-US"} {
			bank := FindPracticeBank(concept.ID, locale)
			if bank == nil || len(bank.Questions) < 10 {
				t.Fatalf("%s: fewer than 10 questions", concept.ID)
			}
			seen := map[string]bool{}
			prompts := map[string]bool{}
			for _, q := range bank.Questions {
				if seen[q.ID] || prompts[q.Prompt] || len(q.ID) > 96 || q.Prompt == "" || q.Explanation == "" {
					t.Fatalf("invalid or duplicate practice question: %s", q.ID)
				}
				seen[q.ID], prompts[q.Prompt] = true, true
			}
		}
		href, err := url.Parse(concept.PracticeHref)
		if err != nil || href.Path != "/learn/practice" || href.Query().Get("concept") != concept.ID {
			t.Fatalf("invalid practice link: %s", concept.PracticeHref)
		}
	}
	if FindPracticeBank("lesson:missing", "zh-CN") != nil {
		t.Fatal("unknown concept accepted")
	}
}

func TestPracticeSupplementAnswers(t *testing.T) {
	// Independent calculations for the newly authored numerical questions.
	expected := map[string]float64{
		"rc-product": 4000 * 5e-6, "decay-time": 1.0 / 4, "step-three-tau": 3, "tau-capacitance": .008 / 2000 * 1e6,
		"model-coefficient":  5,
		"spectral-rectangle": 4 * 6 * math.Pi / (2 * math.Pi), "spectral-inverse": 2 * 5, "spectral-gain": 3 * 3 * 4, "spectral-scaling": 12.0 / 4,
		"spectral-cosine": 16.0 / 2, "spectral-dc": 4 + 4.0/2, "spectral-coefficients": 1 + 4 + 4,
		"operator-linear": -2 + 4, "operator-compose": (2 + 1) * (2 + 3), "operator-quadratic": 16 - 12 + 2,
		"operator-annihilate": 0, // (D - 3)e^(3t) = (3 - 3)e^(3t) = 0.
		"operator-second":     9, "operator-third": 8, "operator-gain": 2*3 + 1, "operator-difference": 9 - 4, "operator-polynomial": 2 + 2*1 + 3, "operator-expand": 3 + 5,
		"periodic-dc-weight": 2 * 3, "periodic-cosine-weight": 2 * (4.0 / 2), "periodic-harmonic-location": 4 * 3, "periodic-coefficient-weight": 2 * 2.5,
		"periodic-inverse-weight": 6.0 / 2, "periodic-impulse-train": 2 / .5, "periodic-line-count": 1 + 2 + 2,
		"state-trace": -2 - 3, "state-determinant": (-2) * (-3), "state-output": 2*1 + 3*3, "state-derivative": -2*2 + 1 + 2,
	}
	if len(expected) != len(practiceSupplements) {
		t.Fatal("missing numerical checks")
	}
	for _, q := range practiceSupplements {
		want, ok := expected[q.ID[len("supp-"):]]
		if !ok || math.Abs(q.Expected-want) > 1e-9 {
			t.Fatalf("%s: got %g want %g", q.ID, q.Expected, want)
		}
	}
}
