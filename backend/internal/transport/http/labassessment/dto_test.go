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
