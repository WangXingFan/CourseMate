package models

import "time"

type LabAssessment struct {
	ID          string `gorm:"size:36;primaryKey"`
	ClassroomID string `gorm:"size:32;not null;uniqueIndex:idx_lab_class_course"`
	CourseID    string `gorm:"size:2;not null;uniqueIndex:idx_lab_class_course"`
	Version     string `gorm:"size:64;not null"`
	TeacherID   uint   `gorm:"not null"`
	Open        bool   `gorm:"not null"`
	StartsAt    time.Time
	Deadline    *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (LabAssessment) TableName() string { return "classroom_lab_assessments" }

type LabAssessmentState struct {
	AssignmentID string `gorm:"size:36;primaryKey"`
	UserID       uint   `gorm:"primaryKey;autoIncrement:false"`
	Payload      string `gorm:"type:text;not null"`
	UpdatedAt    time.Time
}

func (LabAssessmentState) TableName() string { return "student_lab_assessment_states" }
