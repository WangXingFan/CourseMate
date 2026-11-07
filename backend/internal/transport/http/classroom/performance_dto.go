package classroom

import "time"

type PerformanceOptions struct {
	StartAt *time.Time `json:"startAt" extensions:"x-nullable"`
	EndAt   *time.Time `json:"endAt" extensions:"x-nullable"`
	QuizIDs []string   `json:"quizIds"`
}

type PerformanceStage struct {
	Phase         string  `json:"phase"`
	Expected      int     `json:"expected"`
	Completed     int     `json:"completed"`
	Quality       float64 `json:"quality"`
	Participation float64 `json:"participation"`
}

// Evidence contains scored results, never the answer keys from question snapshots.
type PerformanceEvidence struct {
	QuizID       string    `json:"quizId"`
	Title        string    `json:"title"`
	Phase        string    `json:"phase"`
	SourceQuizID string    `json:"sourceQuizId"`
	QuestionID   string    `json:"questionId"`
	ConceptID    string    `json:"conceptId"`
	ClosedAt     time.Time `json:"closedAt"`
	Submitted    bool      `json:"submitted"`
	Points       int       `json:"points"`
	Total        int       `json:"total"`
	Outcome      string    `json:"outcome"`
}

type PerformanceStudent struct {
	UserID        uint                  `json:"userId"`
	StudentID     string                `json:"studentId"`
	Username      string                `json:"username"`
	Name          string                `json:"name"`
	Stages        []PerformanceStage    `json:"stages"`
	Quality       float64               `json:"quality"`
	Participation float64               `json:"participation"`
	Growth        *float64              `json:"growth" extensions:"x-nullable"`
	Consistency   float64               `json:"consistency"`
	ExpectedWeeks int                   `json:"expectedWeeks"`
	ActiveWeeks   int                   `json:"activeWeeks"`
	Pairs         int                   `json:"pairs"`
	Improved      int                   `json:"improved"`
	Retained      int                   `json:"retained"`
	Regressed     int                   `json:"regressed"`
	Unresolved    int                   `json:"unresolved"`
	MissingPairs  int                   `json:"missingPairs"`
	Raw           *float64              `json:"raw" extensions:"x-nullable"`
	Rank          *float64              `json:"rank" extensions:"x-nullable"`
	Converted     *float64              `json:"converted" extensions:"x-nullable"`
	Final         *float64              `json:"final" extensions:"x-nullable"`
	Reason        string                `json:"reason"`
	Status        string                `json:"status"`
	Evidence      []PerformanceEvidence `json:"evidence"`
}

type PerformanceActivity struct {
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	Phase        string    `json:"phase"`
	SourceQuizID string    `json:"sourceQuizId"`
	ClosedAt     time.Time `json:"closedAt"`
}

type PerformanceReport struct {
	Version     string                `json:"version"`
	ClassroomID string                `json:"classroomId"`
	Options     PerformanceOptions    `json:"options"`
	Mean        float64               `json:"mean"`
	Deviation   float64               `json:"deviation"`
	Eligible    int                   `json:"eligible"`
	Conversion  string                `json:"conversion"`
	Activities  []PerformanceActivity `json:"activities"`
	Students    []PerformanceStudent  `json:"students"`
	Fingerprint string                `json:"fingerprint"`
}

type PerformanceRecord struct {
	ID        string            `json:"id"`
	Title     string            `json:"title"`
	CreatedAt time.Time         `json:"createdAt"`
	Report    PerformanceReport `json:"report"`
}

type PerformanceCorrection struct {
	StudentID string  `json:"studentId"`
	Score     float64 `json:"score"`
	Reason    string  `json:"reason"`
}

type FinalizePerformance struct {
	Title       string                  `json:"title"`
	Options     PerformanceOptions      `json:"options"`
	Fingerprint string                  `json:"fingerprint"`
	Corrections []PerformanceCorrection `json:"corrections"`
}
