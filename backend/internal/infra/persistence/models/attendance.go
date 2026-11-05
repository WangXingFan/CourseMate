package models

import "time"

type AttendanceSession struct {
	ID          string `gorm:"primaryKey;size:32"`
	ClassroomID uint   `gorm:"not null;index"`
	TeacherID   uint   `gorm:"not null"`
	Title       string `gorm:"size:120;not null"`
	Secret      string `gorm:"size:64;not null"`
	StartsAt    time.Time
	EndsAt      time.Time
	LateAt      *time.Time
	ClosedAt    *time.Time
	UpdatedAt   time.Time
}

func (AttendanceSession) TableName() string { return "classroom_attendance_sessions" }

type AttendanceRecord struct {
	SessionID       string `gorm:"primaryKey;size:32"`
	StudentID       uint   `gorm:"primaryKey;autoIncrement:false"`
	StudentPublicID string `gorm:"size:32;not null"`
	Username        string `gorm:"size:64;not null"`
	DisplayName     string `gorm:"size:128;not null"`
	Status          string `gorm:"size:16;not null"`
	CheckedAt       *time.Time
	Corrections     string `gorm:"type:text;not null"`
	AttemptWindow   int64
	FailedAttempts  int
}

func (AttendanceRecord) TableName() string { return "classroom_attendance_records" }
