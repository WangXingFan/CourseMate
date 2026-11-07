package models

import "time"

type ClassroomGradeRecord struct {
	ID          string `gorm:"size:32;primaryKey"`
	ClassroomID uint   `gorm:"not null;index"`
	TeacherID   uint   `gorm:"not null"`
	Title       string `gorm:"size:120;not null"`
	CreatedAt   time.Time
	Report      string `gorm:"type:text;not null"`
	Workbook    []byte `gorm:"not null"`
}

func (ClassroomGradeRecord) TableName() string { return "classroom_grade_records" }
