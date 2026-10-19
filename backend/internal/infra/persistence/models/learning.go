package models

import "time"

type LearningAttempt struct {
	ID           uint   `gorm:"primaryKey;autoIncrement"`
	UserID       uint   `gorm:"not null;uniqueIndex:idx_learning_attempt;index:idx_learning_user_question"`
	AttemptID    string `gorm:"size:36;not null;uniqueIndex:idx_learning_attempt"`
	QuestionID   string `gorm:"size:64;not null;index:idx_learning_user_question"`
	Selected     int    `gorm:"not null"`
	Correct      bool   `gorm:"not null"`
	Mode         string `gorm:"size:16;not null;default:quiz"`
	VariantID    string `gorm:"size:64;not null;default:''"`
	ReviewStage  int    `gorm:"not null;default:0"`
	NextReviewAt *time.Time
	CreatedAt    time.Time
}

func (LearningAttempt) TableName() string { return "user_learning_attempts" }
