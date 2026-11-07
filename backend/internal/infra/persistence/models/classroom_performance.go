package models

import "time"

type ClassroomPerformanceRecord struct {
	ID          string `gorm:"size:32;primaryKey"`
	ClassroomID uint   `gorm:"not null;index"`
	Title       string `gorm:"size:120;not null"`
	CreatedAt   time.Time
	Report      string `gorm:"type:text;not null"`
}

func (ClassroomPerformanceRecord) TableName() string { return "classroom_performance_records" }
