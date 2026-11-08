package models

import "time"

type ClassroomHomework struct {
	Withdrawn  bool `gorm:"not null;default:false"`
	FeedbackAt *time.Time
	Changes    string `gorm:"type:text;not null;default:'[]'"`
	ControlPlaneModel
	PublicID    string    `gorm:"size:32;not null;uniqueIndex"`
	ClassroomID uint      `gorm:"not null;index"`
	TeacherID   uint      `gorm:"not null;index"`
	BankID      string    `gorm:"size:64;not null"`
	Title       string    `gorm:"size:120;not null"`
	Questions   string    `gorm:"type:text;not null"`
	StartsAt    time.Time `gorm:"not null"`
	Deadline    time.Time `gorm:"not null"`
}

func (ClassroomHomework) TableName() string { return "classroom_homeworks" }

type ClassroomHomeworkSubmission struct {
	Corrections string `gorm:"type:text;not null;default:'[]'"`
	ID          uint   `gorm:"primaryKey;autoIncrement"`
	HomeworkID  uint   `gorm:"not null;uniqueIndex:idx_homework_student"`
	StudentID   uint   `gorm:"not null;uniqueIndex:idx_homework_student"`
	Answers     string `gorm:"type:text;not null"`
	Results     string `gorm:"type:text;not null"`
	Score       int    `gorm:"not null"`
	CreatedAt   time.Time
}

func (ClassroomHomeworkSubmission) TableName() string { return "classroom_homework_submissions" }
