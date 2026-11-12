package labassessment

import (
	"fmt"
	"testing"
)

func TestECGObservationPapersAndIndependentScoring(t *testing.T) {
	for variant := 0; variant < 64; variant++ {
		p, err := PaperFor("L1-4", variant)
		if err != nil || len(p.Fields) != 5 {
			t.Fatalf("paper %d: %+v %v", variant, p, err)
		}
		period := 1000 / p.Parameters["frequency"]
		window := p.Fields[0]
		found := false
		for _, option := range window.Options {
			if option.ID == window.Answer {
				found = option.Label == fmt.Sprintf("%.0f ms", period)
			}
		}
		if !found || p.Fields[2].Expected != p.Parameters["timeMs"]-p.Parameters["widthMs"]/2 {
			t.Fatalf("wrong physics in v%d", variant)
		}
		answers := answerKey(p)
		answers["windowCenter"] = fmt.Sprintf("%.3f s", p.Fields[2].Expected/1000)
		result, err := Grade(p, answers)
		if err != nil || result.Score != 20 {
			t.Fatalf("unit conversion v%d: %+v %v", variant, result, err)
		}
		answers["windowCenter"] = fmt.Sprint(p.Parameters["timeMs"])
		result, err = Grade(p, answers)
		if err != nil || result.Score != 15 || result.Independent != 10 || result.Concepts != 5 {
			t.Fatalf("independent score v%d: %+v %v", variant, result, err)
		}
	}
	for _, point := range Checkpoints("L1-4") {
		answers := answerKey(point.Paper)
		result, err := Grade(point.Paper, answers)
		if err != nil || result.Score != point.Maximum {
			t.Fatalf("checkpoint: %+v %v", result, err)
		}
		answers[point.Paper.Fields[0].ID] = ""
		result, err = Grade(point.Paper, answers)
		if err != nil || result.Score >= point.Maximum {
			t.Fatalf("incomplete observation passed: %+v %v", result, err)
		}
	}
}
