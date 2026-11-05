package attendance

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"time"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/apperr"
)

var (
	ErrForbidden  = apperr.New("attendance.forbidden", "attendance access denied")
	ErrNotFound   = apperr.New("attendance.not_found", "attendance session or student not found")
	ErrInvalid    = apperr.New("attendance.invalid", "invalid attendance details")
	ErrClosed     = apperr.New("attendance.closed", "attendance session has ended")
	ErrCode       = apperr.New("attendance.code", "incorrect or expired attendance code")
	ErrAttempts   = apperr.New("attendance.attempts", "too many attempts; wait for the next code")
	ErrActivation = apperr.New("attendance.activation", "change your initial password before checking in")
)

type Session struct {
	ID          string
	ClassroomID uint
	TeacherID   uint
	Title       string
	Secret      string
	StartsAt    time.Time
	EndsAt      time.Time
	LateAt      *time.Time
	ClosedAt    *time.Time
}

func (s Session) Open(now time.Time) bool {
	return s.ClosedAt == nil && !now.Before(s.StartsAt) && now.Before(s.EndsAt)
}

// Code is bound to this session and a 30-second server-time window.
func (s Session) Code(now time.Time) (string, time.Time) {
	window := now.Unix() / 30
	mac := hmac.New(sha256.New, []byte(s.Secret))
	_, _ = fmt.Fprintf(mac, "%s:%d", s.ID, window)
	value := binary.BigEndian.Uint32(mac.Sum(nil)[:4]) % 1000000
	expires := time.Unix((window+1)*30, 0).UTC()
	if s.EndsAt.Before(expires) {
		expires = s.EndsAt
	}
	return fmt.Sprintf("%06d", value), expires
}

type Correction struct {
	ActorID  uint
	At       time.Time
	Previous string
	Status   string
	Reason   string
}

type Record struct {
	SessionID       string
	StudentID       uint
	StudentPublicID string
	Username        string
	DisplayName     string
	Status          string
	CheckedAt       *time.Time
	Corrections     []Correction
	AttemptWindow   int64
	FailedAttempts  int
}

type StudentSession struct {
	Session Session
	Record  Record
}
