package labassessment

import (
	"math"
	"testing"
)

func TestResponseDiagnosisVariantsAndIndependentCredit(t *testing.T) {
	sources, targets, predictions := map[string]bool{}, map[float64]bool{}, map[string]bool{}
	positions := map[int]bool{}
	for v := 0; v < 64; v++ {
		p, err := PaperFor("L1-3", v)
		if err != nil {
			t.Fatal(err)
		}
		initial, amplitude := p.Parameters["y0"], p.Parameters["A"]
		if len(p.Reference) != 161 || p.Reference[0].Y != initial || math.Abs(p.Reference[160].Y-(amplitude+(initial-amplitude)*math.Exp(-8))) > 1e-12 {
			t.Fatal("wrong reference curve")
		}
		source := "both"
		if initial == 2 && amplitude == 1 {
			source = "neither"
		} else if initial == 2 {
			source = "input"
		} else if amplitude == 1 {
			source = "initial"
		}
		if p.Fields[0].Answer != source {
			t.Fatalf("v%d wrong diagnosis", v)
		}
		sources[source], targets[p.Parameters["target"]], predictions[p.Fields[2].Answer] = true, true, true
		for i, option := range p.Fields[0].Options {
			if option.ID == source {
				positions[i] = true
			}
		}
		for index := 0; index < 3; index++ {
			answers := answerKey(p)
			field := p.Fields[index]
			for _, option := range field.Options {
				if option.ID != field.Answer {
					answers[field.ID] = option.ID
					break
				}
			}
			r, err := Grade(p, answers)
			if err != nil || r.Score != 15 || r.Independent != 10 || r.Concepts != 5 || r.Fields[index].Correct {
				t.Fatalf("v%d field%s must lose exactly5: %+v %v", v, field.ID, r, err)
			}
		}
	}
	if len(sources) != 4 || len(targets) != 2 || len(predictions) != 2 || len(positions) != 4 {
		t.Fatal("variants must vary sources, targets, results and answer positions")
	}
}

func TestResponseOperationRequiresCorrectTestAndObservation(t *testing.T) {
	for i, point := range Checkpoints("L1-3") {
		if point.Maximum != float64(i+2) || len(point.Paper.Fields) != 2 || len(point.Paper.Reference) != 161 {
			t.Fatal("wrong operation points")
		}
		answers := answerKey(point.Paper)
		r, err := Grade(point.Paper, answers)
		if err != nil || r.Score != point.Maximum {
			t.Fatalf("correct operation: %+v %v", r, err)
		}
		answers["test"] = "clearBoth"
		r, err = Grade(point.Paper, answers)
		if err != nil || r.Fields[0].Correct {
			t.Fatal("clearing all sources cannot isolate one source")
		}
		answers = answerKey(point.Paper)
		answers["observation"] = "overlap"
		r, err = Grade(point.Paper, answers)
		if err != nil || r.Fields[1].Correct {
			t.Fatal("a correct test without a correct observation cannot pass")
		}
	}
	p, _ := PaperFor("L1-3", 0)
	if _, err := Grade(p, map[string]string{"A": "1", "initial": "2", "total": "1.3"}); err != ErrInvalid {
		t.Fatal("legacy parameter answers must not earn credit")
	}
}
