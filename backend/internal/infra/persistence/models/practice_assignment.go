package models

import "time"

type ClassroomPracticeAssignment struct {
	ID          uint      `gorm:"primaryKey;autoIncrement"`
	PublicID    string    `gorm:"size:32;not null;uniqueIndex"`
	ClassroomID uint      `gorm:"not null;index"`
	TeacherID   uint      `gorm:"not null"`
	Payload     string    `gorm:"type:text;not null"`
	Deadline    time.Time `gorm:"not null"`
	CreatedAt   time.Time
}

func (ClassroomPracticeAssignment) TableName() string { return "classroom_practice_assignments" }

type ClassroomPracticeSubmission struct {
	ID           uint   `gorm:"primaryKey;autoIncrement"`
	AssignmentID uint   `gorm:"not null;uniqueIndex:idx_practice_assignment_student"`
	StudentID    uint   `gorm:"not null;uniqueIndex:idx_practice_assignment_student"`
	Payload      string `gorm:"type:text;not null"`
	CreatedAt    time.Time
}

func (ClassroomPracticeSubmission) TableName() string { return "classroom_practice_submissions" }
