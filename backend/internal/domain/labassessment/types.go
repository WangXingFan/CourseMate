package labassessment

import (
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/apperr"
	"time"
)

const Version = "lab-grade-2026-11-v1"

var (
	ErrInvalid   = apperr.New("lab.invalid", "invalid assessment input")
	ErrClosed    = apperr.New("lab.closed", "assessment is closed")
	ErrLimit     = apperr.New("lab.limit", "assessment attempts exhausted")
	ErrConflict  = apperr.New("lab.conflict", "assessment submission conflict")
	ErrNotFound  = apperr.New("lab.not_found", "assessment not found")
	ErrForbidden = apperr.New("lab.forbidden", "assessment access denied")
)

// Paper and expected answers are persisted together, but only explicit public
// fields are projected by HTTP. Never serialize this object to a student.
type Option struct{ ID, Label string }
type Field struct {
	ID, Label, Unit, Answer, Explanation string
	Points, Expected, Tolerance          float64
	Kind                                 string // number, integer, phase, choice, alpha, ratio
	Options                              []Option
}
type Point struct{ X, Y float64 }
type Observation struct {
	ID            string
	Input, Output []Point
}
type Paper struct {
	TaskID, Title, Prompt, Formula, Explanation string
	Variant                                     int
	Parameters                                  map[string]float64
	Fields                                      []Field
	Reference                                   []Point
	Observations                                []Observation
}
type FieldResult struct {
	ID, Submitted, Expected, Explanation string
	Correct                              bool
	Points, Maximum                      float64
}
type Result struct {
	Score, Independent, Concepts float64
	Fields                       []FieldResult
}
type Attempt struct {
	ID          string
	Paper       Paper
	StartedAt   time.Time
	SubmittedAt *time.Time
	RequestID   string
	Answers     map[string]string
	Result      *Result
}
type Checkpoint struct {
	Paper   Paper
	Maximum float64
}
type CheckpointResult struct {
	Passed  bool
	At      time.Time
	Answers map[string]string
	Result  Result
}
type TaskState struct {
	TaskID      string
	Attempts    []Attempt
	Checkpoints map[string]CheckpointResult
	Explained   bool
	Correction  *Correction
	Corrections []Correction
}
type Correction struct {
	Score     float64
	Reason    string
	TeacherID uint
	At        time.Time
}
type State struct {
	AssignmentID string
	UserID       uint
	Tasks        map[string]*TaskState
}
type Assignment struct {
	ID, ClassroomID, CourseID, Version string
	TeacherID                          uint
	Open                               bool
	StartsAt                           time.Time
	Deadline                           *time.Time
	ClosedAt                           *time.Time
	CreatedAt                          time.Time
}

func (a Assignment) Active(now time.Time) bool {
	return a.Open && !now.Before(a.StartsAt) && (a.Deadline == nil || now.Before(*a.Deadline))
}
func (a Assignment) Final(now time.Time) bool {
	return !a.Open || a.Deadline != nil && !now.Before(*a.Deadline)
}
func (a Assignment) AppliesTo(joinedAt time.Time) bool {
	if joinedAt.IsZero() {
		return true
	}
	end := a.Deadline
	if !a.Open && a.ClosedAt != nil && (end == nil || a.ClosedAt.Before(*end)) {
		end = a.ClosedAt
	}
	return end == nil || end.After(joinedAt)
}
func TaskIDs(course string) []string {
	if course != "L1" && course != "L2" && course != "L3" {
		return nil
	}
	return []string{course + "-1", course + "-2", course + "-3", course + "-4"}
}
func (s *State) Task(id string) *TaskState {
	if s.Tasks == nil {
		s.Tasks = map[string]*TaskState{}
	}
	if s.Tasks[id] == nil {
		s.Tasks[id] = &TaskState{TaskID: id, Attempts: []Attempt{}, Checkpoints: map[string]CheckpointResult{}}
	}
	return s.Tasks[id]
}
func (s TaskState) Scores() (operations, independent, concepts, total float64) {
	for key, c := range s.Checkpoints {
		if c.Passed {
			if key == "O1" {
				operations += 2
			}
			if key == "O2" {
				operations += 3
			}
		}
	}
	for _, a := range s.Attempts {
		if a.Result != nil && a.Result.Score > independent+concepts {
			independent = a.Result.Independent
			concepts = a.Result.Concepts
		}
	}
	total = operations + independent + concepts
	if s.Correction != nil {
		total = s.Correction.Score
	}
	return
}
