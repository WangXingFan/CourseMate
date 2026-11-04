package labassessment

import (
	"math"
	"reflect"
	"strconv"
	"testing"
)

func answerKey(p Paper) map[string]string {
	out := map[string]string{}
	for _, f := range p.Fields {
		if f.Kind == "choice" {
			out[f.ID] = f.Answer
		} else {
			out[f.ID] = strconv.FormatFloat(f.Expected, 'g', 17, 64)
		}
	}
	return out
}
func TestAllPapersAndReplacementParameters(t *testing.T) {
	for task := range Titles {
		for v := 0; v < 64; v++ {
			p, err := PaperFor(task, v)
			if err != nil {
				t.Fatal(err)
			}
			r, err := Grade(p, answerKey(p))
			if err != nil || math.Abs(r.Score-20) > 1e-9 || r.Independent != 15 || r.Concepts != 5 {
				t.Fatalf("%s v%d: %+v %v", task, v, r, err)
			}
			found := false
			for other := 0; other < 64; other++ {
				if other%2 == v%2 {
					continue
				}
				q, _ := PaperFor(task, other)
				if !reflect.DeepEqual(p.Parameters, q.Parameters) {
					found = true
					break
				}
			}
			if !found {
				t.Fatalf("%s has no equivalent replacement", task)
			}
		}
	}
}
func TestUnitsPartialCreditAndExactDesign(t *testing.T) {
	p, _ := PaperFor("L1-1", 0)
	a := answerKey(p)
	a["peakTime"] = "500 ms"
	a["height"] = "999"
	r, err := Grade(p, a)
	if err != nil || r.Score != 17 || !r.Fields[0].Correct {
		t.Fatalf("unit/partial credit %+v %v", r, err)
	}
	a["peakTime"] = "one"
	if _, err = Grade(p, a); err != ErrInvalid {
		t.Fatal("malformed answers must be rejected")
	}
	p, _ = PaperFor("L3-4", 0)
	a = answerKey(p)
	a["grid"] = "1.04s"
	r, err = Grade(p, a)
	if err != nil || r.Fields[1].Correct {
		t.Fatal("infeasible adjacent grid must not pass")
	}
	p, _ = PaperFor("L2-3", 0)
	a = answerKey(p)
	a["alpha"] = "-10"
	a["keepRatio"] = strconv.FormatFloat(Notch(48, -10, 8), 'g', 17, 64)
	r, err = Grade(p, a)
	if err != nil || r.Fields[2].Correct || !r.Fields[3].Correct {
		t.Fatal("design and own-design computation must score independently")
	}
}
func TestBestWholeAttempt(t *testing.T) {
	s := TaskState{Attempts: []Attempt{{Result: &Result{Score: 15, Independent: 15}}, {Result: &Result{Score: 17, Independent: 12, Concepts: 5}}}, Checkpoints: map[string]CheckpointResult{"O1": {Passed: true}}}
	o, i, c, total := s.Scores()
	if o != 2 || i != 12 || c != 5 || total != 19 {
		t.Fatalf("mixed attempts: %v %v %v %v", o, i, c, total)
	}
}
