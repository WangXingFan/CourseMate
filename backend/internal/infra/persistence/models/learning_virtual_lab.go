package models

import "time"

type LearningVirtualLab struct {
	UserID    uint   `gorm:"primaryKey;autoIncrement:false"`
	Revision  uint64 `gorm:"not null"`
	Document  string `gorm:"type:text;not null"`
	UpdatedAt time.Time
}

func (LearningVirtualLab) TableName() string { return "user_learning_virtual_labs" }
