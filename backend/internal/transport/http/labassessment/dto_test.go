package labassessment

import (
	"encoding/json"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	"strings"
	"testing"
	"time"
)

func TestStudentProjectionDoesNotLeakAnswers(t *testing.T) {
	p, _ := domain.PaperFor("L1-1", 0)
	r, _ := domain.Grade(p, map[string]string{})
	now := time.Now()
	s := domain.State{}
	task := s.Task("L1-1")
	task.Attempts = []domain.Attempt{{Paper: p, Result: &r, SubmittedAt: &now}}
	a := domain.Assignment{CourseID: "L1", Open: true}
	view := assessmentView(a, s, false)
	payload, _ := json.Marshal(view.Tasks[0].Attempts)
	for _, private := range []string{"expected", "explanation", "parameters", "variant", "tolerance"} {
		if strings.Contains(strings.ToLower(string(payload)), private) {
			t.Fatal("leaked", private)
		}
	}
	task.Explained = true
	view = assessmentView(a, s, false)
	if view.Tasks[0].Attempts[0].Result.Fields[0].Expected == "" || view.Tasks[0].Remaining != 0 {
		t.Fatal("explicit explanation missing")
	}
}

func TestResponseDiagnosisPublicPaper(t *testing.T) {
	p, _ := domain.PaperFor("L1-3", 18)
	view := paperView(p)
	payload, err := json.Marshal(view)
	if err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{`"answer":`, `"parameters":`, `"expected":`, `"explanation":`} {
		if strings.Contains(strings.ToLower(string(payload)), key) {
			t.Fatal("leaked", key)
		}
	}
	if len(view.Reference) != 161 || len(view.Fields) != 5 || view.Fields[0].Kind != "choice" {
		t.Fatal("the public paper must provide a curve and all five scored judgments")
	}
}

func TestBlackBoxPublicObservationsDoNotLeakScoring(t *testing.T) {
	p, _ := domain.PaperFor("L1-2", 9)
	view := paperView(p)
	if len(view.Observations) != 3 || len(view.Observations[0].Input) != 6 || len(view.Observations[0].Output) != 6 {
		t.Fatal("the public paper must include independent input/output probes")
	}
	payload, err := json.Marshal(view)
	if err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{`"answer":`, `"parameters":`, `"expected":`, `"explanation":`, `"variant":`} {
		if strings.Contains(strings.ToLower(string(payload)), key) {
			t.Fatal("leaked", key)
		}
	}
}
