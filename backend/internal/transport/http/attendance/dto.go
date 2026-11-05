package attendance

import (
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/attendance"
	"time"
)

type AttendanceCreateRequest struct {
	Title     string `json:"title" binding:"required,max=120"`
	Minutes   int    `json:"minutes" binding:"required,min=1,max=180"`
	LateAfter int    `json:"lateAfter" binding:"min=0,max=179"`
}
type AttendanceCheckInRequest struct {
	Code string `json:"code" binding:"required,len=6,numeric"`
}
type AttendanceCorrectionRequest struct {
	Status string `json:"status" binding:"required,oneof=present late absent excused"`
	Reason string `json:"reason" binding:"required,max=300"`
}
type AttendanceSessionResponse struct {
	ID       string     `json:"id"`
	Title    string     `json:"title"`
	StartsAt time.Time  `json:"startsAt"`
	EndsAt   time.Time  `json:"endsAt"`
	LateAt   *time.Time `json:"lateAt" extensions:"x-nullable"`
	ClosedAt *time.Time `json:"closedAt" extensions:"x-nullable"`
	Open     bool       `json:"open"`
}
type AttendanceCorrectionResponse struct {
	ActorID  uint      `json:"actorId"`
	At       time.Time `json:"at"`
	Previous string    `json:"previous"`
	Status   string    `json:"status"`
	Reason   string    `json:"reason"`
}
type AttendanceRecordResponse struct {
	StudentID   string                         `json:"studentId"`
	Username    string                         `json:"username"`
	DisplayName string                         `json:"displayName"`
	Status      string                         `json:"status" enums:"present,late,absent,excused"`
	CheckedAt   *time.Time                     `json:"checkedAt" extensions:"x-nullable"`
	Corrections []AttendanceCorrectionResponse `json:"corrections"`
}
type AttendanceListResponse struct {
	Items []AttendanceSessionResponse `json:"items"`
}
type AttendanceReportResponse struct {
	Session       AttendanceSessionResponse  `json:"session"`
	Records       []AttendanceRecordResponse `json:"records"`
	Code          string                     `json:"code"`
	CodeExpiresAt *time.Time                 `json:"codeExpiresAt" extensions:"x-nullable"`
	ServerTime    time.Time                  `json:"serverTime"`
}
type AttendanceStudentItemResponse struct {
	Session AttendanceSessionResponse `json:"session"`
	Record  AttendanceRecordResponse  `json:"record"`
}
type AttendanceStudentListResponse struct {
	Items []AttendanceStudentItemResponse `json:"items"`
}
type AttendanceMutationResponse struct {
	Updated bool `json:"updated"`
}

func sessionView(a domain.Session, now time.Time) AttendanceSessionResponse {
	return AttendanceSessionResponse{ID: a.ID, Title: a.Title, StartsAt: a.StartsAt, EndsAt: a.EndsAt, LateAt: a.LateAt, ClosedAt: a.ClosedAt, Open: a.Open(now)}
}
func recordView(r domain.Record) AttendanceRecordResponse {
	v := AttendanceRecordResponse{StudentID: r.StudentPublicID, Username: r.Username, DisplayName: r.DisplayName, Status: r.Status, CheckedAt: r.CheckedAt, Corrections: []AttendanceCorrectionResponse{}}
	for _, c := range r.Corrections {
		v.Corrections = append(v.Corrections, AttendanceCorrectionResponse{ActorID: c.ActorID, At: c.At, Previous: c.Previous, Status: c.Status, Reason: c.Reason})
	}
	return v
}
