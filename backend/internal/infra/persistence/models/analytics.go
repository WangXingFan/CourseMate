package models

import "time"

type UsageVisit struct {
	ID          uint      `gorm:"primaryKey"`
	EventID     string    `gorm:"size:36;not null;uniqueIndex:idx_usage_event"`
	UserID      uint      `gorm:"not null;uniqueIndex:idx_usage_event"`
	ClassroomID uint      `gorm:"not null;index:idx_usage_class_time,priority:1"`
	Resource    string    `gorm:"size:64;not null"`
	CreatedAt   time.Time `gorm:"not null;index;index:idx_usage_class_time,priority:2"`
}

func (UsageVisit) TableName() string { return "user_usage_visits" }
