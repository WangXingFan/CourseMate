package classroom

import "time"

const GradeVersion = "classroom-summary-v1"

type GradeStudent struct {
	StudentID, Username, Name string
	Scores                    map[string]*float64
	Final                     *float64
}

type GradeReport struct {
	Version, ClassroomID, ClassroomName, Fingerprint string
	PerformanceRecordID, AIStartDate, AIEndDate      string
	GeneratedAt                                      time.Time
	Weights                                          map[string]float64
	Students                                         []GradeStudent
}

// The workbook retains the original task evidence and rules alongside the scores.
type GradeRecord struct {
	ID, Title   string
	ClassroomID uint
	TeacherID   uint
	CreatedAt   time.Time
	Report      GradeReport
	Workbook    []byte
}
