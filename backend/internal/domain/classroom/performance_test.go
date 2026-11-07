package classroom

import (
	"fmt"
	"math"
	"testing"
	"time"
)

func TestPerformanceStagesPairsMissingAndJoinDate(t *testing.T) {
	first := time.Date(2026, 10, 12, 8, 0, 0, 0, time.UTC)
	second := first.AddDate(0, 0, 7)
	choice := QuizQuestion{ID: "choice", ConceptID: "concept", Options: []string{"A", "B"}, Answer: 0}
	numeric := QuizQuestion{ID: "numeric", Fields: []QuizField{{ID: "a", Expected: 2}, {ID: "b", Expected: 4}}}
	inputs := []PerformanceInput{
		{Quiz: Quiz{PublicID: "pre", Phase: QuizPhasePreClass, ClosedAt: &first, Questions: []QuizQuestion{choice, numeric}}, Submissions: map[uint]QuizSubmission{1: {Answers: []int{1, -1}, FieldAnswers: map[string]map[string]string{"numeric": {"a": "2", "b": "0"}}}}},
		{Quiz: Quiz{PublicID: "in", Phase: QuizPhaseInClass, ClosedAt: &first, Questions: []QuizQuestion{choice}}, Submissions: map[uint]QuizSubmission{1: {Answers: []int{0}}}},
		{Quiz: Quiz{PublicID: "after", Phase: QuizPhaseAfterClass, ClosedAt: &second, Questions: []QuizQuestion{choice}}, Submissions: map[uint]QuizSubmission{}},
		{Quiz: Quiz{PublicID: "retest", SourceQuizID: "pre", Phase: QuizPhaseInClass, ClosedAt: &second, Questions: []QuizQuestion{choice}}, Submissions: map[uint]QuizSubmission{1: {Answers: []int{0}}}},
	}
	roster := []Student{{ID: 1}, {ID: 2}, {ID: 3, JoinedAt: second.Add(time.Hour)}}
	r, err := BuildPerformance("class", roster, inputs, PerformanceOptions{})
	if err != nil {
		t.Fatal(err)
	}
	s := r.Students[0]
	// Pre = (0 + 0.5)/2 = 25; Q = 25*.3 + 100*.4 = 47.5.
	// P=70, G=100, C=50 -> R=62.75, final=62.8 for a small cohort.
	if s.Quality != 47.5 || s.Participation != 70 || *s.Growth != 100 || s.Consistency != 50 || *s.Raw != 62.75 || *s.Final != 62.8 {
		t.Fatalf("scores: %+v", s)
	}
	if s.Improved != 1 || s.Stages[1].Expected != 1 || len(s.Evidence) != 5 {
		t.Fatalf("retest counted twice or lost: %+v", s)
	}
	if r.Students[1].Status != "not_participated" || *r.Students[1].Final != 0 || r.Students[1].MissingPairs != 1 {
		t.Fatalf("missing student: %+v", r.Students[1])
	}
	if r.Students[2].Status != "no_data" || r.Students[2].Final != nil {
		t.Fatal("new student charged for prior tasks")
	}
	if r.Eligible != 1 || r.Conversion != "small_class" {
		t.Fatalf("conversion: %+v", r)
	}
}

func TestPerformanceUnassignedStagesAndAbsentRetestsRedistribute(t *testing.T) {
	closed := time.Now()
	r, err := BuildPerformance("class", []Student{{ID: 1}}, []PerformanceInput{{Quiz: Quiz{PublicID: "q", Phase: QuizPhaseAfterClass, ClosedAt: &closed, Questions: []QuizQuestion{{ID: "q", Options: []string{"A", "B"}, Answer: 0}}}, Submissions: map[uint]QuizSubmission{1: {Answers: []int{1}}}}}, PerformanceOptions{})
	if err != nil {
		t.Fatal(err)
	}
	s := r.Students[0]
	if s.Status != "assessed" || s.Growth != nil || *s.Raw != 37.5 || s.Participation != 100 {
		t.Fatalf("all wrong still has participation: %+v", s)
	}
}

func TestPerformanceNormalRanksTiesAndNonParticipants(t *testing.T) {
	r := &PerformanceReport{Mean: 80, Deviation: 8}
	for i := 0; i < 12; i++ {
		value := float64(i * 8)
		if i == 6 {
			value = 40.4
		}
		r.Students = append(r.Students, PerformanceStudent{StudentID: fmt.Sprint(i), Status: "assessed", Raw: &value})
	}
	zero := 0.0
	r.Students = append(r.Students, PerformanceStudent{Status: "not_participated", Raw: &zero, Final: &zero})
	convertPerformance(r)
	if r.Conversion != "normal" || *r.Students[5].Converted != *r.Students[6].Converted || *r.Students[5].Rank != 6.5 {
		t.Fatal("ties not preserved")
	}
	if math.Abs(*r.Students[0].Converted-66.1) > .1 || math.Abs(*r.Students[11].Converted-93.9) > .1 {
		t.Fatal("normal quantiles incorrect")
	}
	if r.Students[12].Converted != nil || *r.Students[12].Final != 0 {
		t.Fatal("nonparticipant received converted grade")
	}
	for i := 0; i < 12; i++ {
		v := 100.0
		r.Students[i].Raw = &v
	}
	convertPerformance(r)
	if r.Conversion != "all_tied" {
		t.Fatal("identical scores artificially separated")
	}
}
