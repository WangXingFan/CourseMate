package models

import "time"

type Classroom struct {
	ControlPlaneModel
	PublicID    string `gorm:"size:32;not null;uniqueIndex"`
	TeacherID   uint   `gorm:"not null;index"`
	Name        string `gorm:"size:80;not null"`
	Description string `gorm:"size:255;not null;default:''"`
}

func (Classroom) TableName() string { return "classrooms" }

// StudentID is globally unique: a student belongs to at most one classroom.
type ClassroomStudent struct {
	StudentID   uint `gorm:"primaryKey;autoIncrement:false"`
	ClassroomID uint `gorm:"not null;index"`
	CreatedAt   time.Time
}

func (ClassroomStudent) TableName() string { return "classroom_students" }

// ClassroomQuiz stores the question set as JSON so a quiz is immutable once
// published. Answers remain server-side; student responses store option indices.
type ClassroomQuiz struct {
	ControlPlaneModel
	PublicID    string `gorm:"size:32;not null;uniqueIndex"`
	ClassroomID uint   `gorm:"not null;index"`
	TeacherID   uint   `gorm:"not null;index"`
	Title       string `gorm:"size:120;not null"`
	Phase       string `gorm:"size:16;not null;index"`
	Status      string `gorm:"size:16;not null;index"`
	Questions   string `gorm:"type:text;not null"`
	OpenedAt    *time.Time
	ClosedAt    *time.Time
}

func (ClassroomQuiz) TableName() string { return "classroom_quizzes" }

type ClassroomQuizSubmission struct {
	ID        uint   `gorm:"primaryKey;autoIncrement"`
	QuizID    uint   `gorm:"not null;uniqueIndex:idx_classroom_quiz_submission"`
	StudentID uint   `gorm:"not null;uniqueIndex:idx_classroom_quiz_submission"`
	Answers   string `gorm:"type:text;not null"`
	Score     int    `gorm:"not null;default:0"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (ClassroomQuizSubmission) TableName() string { return "classroom_quiz_submissions" }
