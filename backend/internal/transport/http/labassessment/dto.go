package labassessment

import (
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	"time"
)

type LabAssignmentResponse struct {
	PendingTaskID string     `json:"pendingTaskId,omitempty"`
	InProgress    bool       `json:"inProgress,omitempty"`
	ID            string     `json:"id"`
	ClassroomID   string     `json:"classroomId"`
	CourseID      string     `json:"courseId"`
	Version       string     `json:"version"`
	Open          bool       `json:"open"`
	Active        bool       `json:"active"`
	StartsAt      time.Time  `json:"startsAt"`
	Deadline      *time.Time `json:"deadline" extensions:"x-nullable"`
}
type LabAssignmentsResponse struct {
	Items []LabAssignmentResponse `json:"items"`
}
type LabOptionResponse struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}
type LabFieldResponse struct {
	ID      string              `json:"id"`
	Label   string              `json:"label"`
	Unit    string              `json:"unit"`
	Points  float64             `json:"points"`
	Kind    string              `json:"kind"`
	Options []LabOptionResponse `json:"options"`
}
type LabPointResponse struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}
type LabPaperResponse struct {
	TaskID    string             `json:"taskId"`
	Title     string             `json:"title"`
	Prompt    string             `json:"prompt"`
	Formula   string             `json:"formula"`
	Fields    []LabFieldResponse `json:"fields"`
	Reference []LabPointResponse `json:"reference"`
}
type LabFieldResultResponse struct {
	ID          string  `json:"id"`
	Submitted   string  `json:"submitted"`
	Correct     bool    `json:"correct"`
	Points      float64 `json:"points"`
	Maximum     float64 `json:"maximum"`
	Expected    string  `json:"expected,omitempty"`
	Explanation string  `json:"explanation,omitempty"`
}
type LabResultResponse struct {
	Score       float64                  `json:"score"`
	Independent float64                  `json:"independent"`
	Concepts    float64                  `json:"concepts"`
	Fields      []LabFieldResultResponse `json:"fields"`
}
type LabAttemptResponse struct {
	ID          string             `json:"id"`
	Paper       LabPaperResponse   `json:"paper"`
	StartedAt   time.Time          `json:"startedAt"`
	SubmittedAt *time.Time         `json:"submittedAt" extensions:"x-nullable"`
	Answers     map[string]string  `json:"answers"`
	Result      *LabResultResponse `json:"result" extensions:"x-nullable"`
}
type LabCheckpointResponse struct {
	ID      string             `json:"id"`
	Paper   LabPaperResponse   `json:"paper"`
	Maximum float64            `json:"maximum"`
	Passed  bool               `json:"passed"`
	Answers map[string]string  `json:"answers"`
	Result  *LabResultResponse `json:"result" extensions:"x-nullable"`
}
type LabCorrectionResponse struct {
	Score  float64   `json:"score"`
	Reason string    `json:"reason"`
	At     time.Time `json:"at"`
}
type LabTaskResponse struct {
	Status      string                  `json:"status"`
	ID          string                  `json:"id"`
	Title       string                  `json:"title"`
	Operations  float64                 `json:"operations"`
	Independent float64                 `json:"independent"`
	Concepts    float64                 `json:"concepts"`
	Total       float64                 `json:"total"`
	Explained   bool                    `json:"explained"`
	Remaining   int                     `json:"remaining"`
	Attempts    []LabAttemptResponse    `json:"attempts"`
	Checkpoints []LabCheckpointResponse `json:"checkpoints"`
	Corrections []LabCorrectionResponse `json:"corrections"`
}
type LabAssessmentResponse struct {
	Assignment LabAssignmentResponse `json:"assignment"`
	Tasks      []LabTaskResponse     `json:"tasks"`
	Total      float64               `json:"total"`
}
type LabStudentGradeResponse struct {
	ID       string                `json:"id"`
	Name     string                `json:"name"`
	Username string                `json:"username"`
	Grade    LabAssessmentResponse `json:"grade"`
}
type LabReportResponse struct {
	Assignment LabAssignmentResponse     `json:"assignment"`
	Students   []LabStudentGradeResponse `json:"students"`
}
type LabPreviewResponse struct {
	Paper  LabPaperResponse  `json:"paper"`
	Result LabResultResponse `json:"result"`
}
type LabPublishRequest struct {
	CourseID string     `json:"courseId" binding:"required"`
	StartsAt time.Time  `json:"startsAt"`
	Deadline *time.Time `json:"deadline"`
}
type LabOpenRequest struct {
	Open *bool `json:"open" binding:"required"`
}
type LabAnswersRequest struct {
	Answers      map[string]string `json:"answers" binding:"required"`
	RequestID    string            `json:"requestId"`
	ConfirmBlank bool              `json:"confirmBlank"`
}
type LabCorrectionRequest struct {
	Score  *float64 `json:"score" binding:"required"`
	Reason string   `json:"reason" binding:"required"`
}
type LabUpdatedResponse struct {
	Updated bool `json:"updated"`
}

func assignmentView(a domain.Assignment) LabAssignmentResponse {
	return LabAssignmentResponse{ID: a.ID, ClassroomID: a.ClassroomID, CourseID: a.CourseID, Version: a.Version, Open: a.Open, Active: a.Active(time.Now()), StartsAt: a.StartsAt, Deadline: a.Deadline}
}
func paperView(p domain.Paper) LabPaperResponse {
	out := LabPaperResponse{TaskID: p.TaskID, Title: p.Title, Prompt: p.Prompt, Formula: p.Formula, Fields: []LabFieldResponse{}, Reference: []LabPointResponse{}}
	for _, f := range p.Fields {
		field := LabFieldResponse{ID: f.ID, Label: f.Label, Unit: f.Unit, Points: f.Points, Kind: f.Kind, Options: []LabOptionResponse{}}
		for _, o := range f.Options {
			field.Options = append(field.Options, LabOptionResponse{ID: o.ID, Label: o.Label})
		}
		out.Fields = append(out.Fields, field)
	}
	for _, pt := range p.Reference {
		out.Reference = append(out.Reference, LabPointResponse{X: pt.X, Y: pt.Y})
	}
	return out
}
func resultView(r domain.Result, reveal bool) LabResultResponse {
	out := LabResultResponse{Score: r.Score, Independent: r.Independent, Concepts: r.Concepts, Fields: []LabFieldResultResponse{}}
	for _, f := range r.Fields {
		item := LabFieldResultResponse{ID: f.ID, Submitted: f.Submitted, Correct: f.Correct, Points: f.Points, Maximum: f.Maximum}
		if reveal {
			item.Expected = f.Expected
			item.Explanation = f.Explanation
		}
		out.Fields = append(out.Fields, item)
	}
	return out
}
func assessmentView(a domain.Assignment, s domain.State, teacher bool) LabAssessmentResponse {
	out := LabAssessmentResponse{Assignment: assignmentView(a), Tasks: []LabTaskResponse{}}
	for _, id := range domain.TaskIDs(a.CourseID) {
		t := s.Task(id)
		o, i, c, total := t.Scores()
		reveal := teacher || t.Explained || len(t.Attempts) == 2 && t.Attempts[1].SubmittedAt != nil
		row := LabTaskResponse{ID: id, Title: domain.Titles[id], Operations: o, Independent: i, Concepts: c, Total: total, Explained: reveal, Remaining: 2 - len(t.Attempts), Attempts: []LabAttemptResponse{}, Checkpoints: []LabCheckpointResponse{}, Corrections: []LabCorrectionResponse{}}
		row.Status = "awaiting"
		for _, at := range t.Attempts {
			if at.SubmittedAt != nil {
				row.Status = "graded"
			}
		}
		if row.Status == "awaiting" && a.Final(time.Now()) {
			row.Status = "missing"
		}
		if t.Explained {
			row.Remaining = 0
		}
		for _, at := range t.Attempts {
			v := LabAttemptResponse{ID: at.ID, Paper: paperView(at.Paper), StartedAt: at.StartedAt, SubmittedAt: at.SubmittedAt, Answers: at.Answers}
			if v.Answers == nil {
				v.Answers = map[string]string{}
			}
			if at.Result != nil {
				r := resultView(*at.Result, reveal)
				v.Result = &r
			}
			row.Attempts = append(row.Attempts, v)
		}
		for index, p := range domain.Checkpoints(id) {
			key := "O1"
			if index == 1 {
				key = "O2"
			}
			saved, exists := t.Checkpoints[key]
			v := LabCheckpointResponse{ID: key, Paper: paperView(p.Paper), Maximum: p.Maximum, Passed: saved.Passed, Answers: map[string]string{}}
			if exists {
				v.Answers = saved.Answers
				r := resultView(saved.Result, true)
				v.Result = &r
			}
			row.Checkpoints = append(row.Checkpoints, v)
		}
		for _, correction := range t.Corrections {
			row.Corrections = append(row.Corrections, LabCorrectionResponse{Score: correction.Score, Reason: correction.Reason, At: correction.At})
		}
		out.Tasks = append(out.Tasks, row)
		out.Total += total
	}
	return out
}
