package labassessment

import (
	"fmt"
	"testing"
)

func TestBlackBoxObservations(t *testing.T) {
	for _, test := range []struct {
		model                                      string
		baseStart, doubleHeight, shiftStart, width float64
	}{
		{"square", 1, 4, 2, 1},
		{"delay", 2, 2, 3, 1},
		{"timescale", .5, 2, 1, .5},
	} {
		observations := blackBoxObservations(test.model)
		if len(observations) != 3 {
			t.Fatal("missing probes", test.model)
		}
		base, double, shift := observations[0], observations[1], observations[2]
		if base.Output[2] != (Point{test.baseStart, 1}) || double.Output[2] != (Point{test.baseStart, test.doubleHeight}) || shift.Output[2] != (Point{test.shiftStart, 1}) || base.Output[3].X-base.Output[2].X != test.width {
			t.Fatalf("incorrect black-box output for %s: %+v", test.model, observations)
		}
		if double.Input[2] != (Point{1, 2}) || shift.Input[2] != (Point{2, 1}) {
			t.Fatal("probes must independently change amplitude or start time")
		}
	}
}

func TestBlackBoxPaperPredictionsScoreIndependently(t *testing.T) {
	for variant := 0; variant < 64; variant++ {
		p, err := PaperFor("L1-2", variant)
		if err != nil || len(p.Fields) != 5 || len(p.Observations) != 3 {
			t.Fatalf("paper %d: %+v %v", variant, p, err)
		}
		height, shift := p.Parameters["height"], p.Parameters["delay"]
		switch p.Parameters["model"] {
		case 0:
			height *= height
		case 2:
			shift /= 2
		}
		answers := answerKey(p)
		answers["outputHeight"] = fmt.Sprint(height)
		answers["outputShift"] = fmt.Sprintf("%g ms", shift*1000)
		result, err := Grade(p, answers)
		if err != nil || result.Score != 20 {
			t.Fatalf("prediction/unit conversion v%d: %+v %v", variant, result, err)
		}
		for _, option := range p.Fields[0].Options {
			if option.ID != p.Fields[0].Answer {
				answers["model"] = option.ID
				break
			}
		}
		result, err = Grade(p, answers)
		if err != nil || result.Score != 15 || result.Independent != 10 || result.Concepts != 5 {
			t.Fatalf("wrong identification must preserve correct predictions v%d: %+v %v", variant, result, err)
		}
	}
	for _, point := range Checkpoints("L1-2") {
		answers := answerKey(point.Paper)
		result, err := Grade(point.Paper, answers)
		if err != nil || result.Score != point.Maximum || len(point.Paper.Observations) != 2 {
			t.Fatalf("checkpoint: %+v %v", result, err)
		}
		answers[point.Paper.Fields[0].ID] = ""
		result, err = Grade(point.Paper, answers)
		if err != nil || result.Score >= point.Maximum {
			t.Fatal("an incomplete observation must not pass", err)
		}
	}
}
