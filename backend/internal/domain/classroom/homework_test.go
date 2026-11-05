package classroom

import (
	"testing"
	"time"
)

func TestHomeworkBankAndGrading(t *testing.T) {
	papers := HomeworkBank()
	if len(papers) != 4 {
		t.Fatal("expected four imported papers")
	}
	for _, p := range papers {
		answers := make([][]string, len(p.Questions))
		for i, q := range p.Questions {
			if q.Prompt == "" || q.ID == "" {
				t.Fatalf("missing content: %+v", q)
			}
			for _, aliases := range q.Accepted {
				answers[i] = append(answers[i], aliases[0])
			}
		}
		results, score, valid := GradeHomework(p.Questions, answers)
		if !valid || score != 100 || len(results) != 10 {
			t.Fatalf("%s: %d %v", p.ID, score, valid)
		}
		answers[0][0] = "wrong"
		if _, _, valid := GradeHomework(p.Questions, answers); valid {
			t.Fatal("invalid choice accepted")
		}
	}
	for _, tc := range []struct {
		got, expected string
		correct       bool
	}{
		{"２６.０", "26", true}, {"52/2", "26", true}, {"2*6", "26", false},
		{`9\cos\left(9 t\right)`, "9cos(9t)", true}, {"jω", "jw", true},
		{"cos(6t)", "cos(5t)", false}, {"", "0", false},
	} {
		if homeworkAnswerMatches(tc.got, tc.expected) != tc.correct {
			t.Fatalf("%q vs %q", tc.got, tc.expected)
		}
	}
	q := papers[1].Questions[4]
	_, score, valid := GradeHomework([]HomeworkQuestion{q}, [][]string{{"4个单位", "3"}})
	if !valid || score != 5 {
		t.Fatalf("partial credit = %d, %v", score, valid)
	}
	if _, _, valid := GradeHomework([]HomeworkQuestion{q}, [][]string{{"4", ""}}); valid {
		t.Fatal("blank accepted")
	}
}

func TestHomeworkTimeBoundary(t *testing.T) {
	now := time.Now()
	h := Homework{StartsAt: now, Deadline: now.Add(time.Hour)}
	if h.Status(now.Add(-time.Nanosecond)) != "scheduled" || h.Status(now) != "open" || h.Status(h.Deadline) != "closed" {
		t.Fatal("invalid time boundary")
	}
}
