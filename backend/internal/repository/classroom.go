package repository

import (
	"context"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
)

type ClassroomRepository interface {
	GetExportProfile(context.Context, uint) (domain.ExportProfile, error)
	SaveExportProfile(context.Context, uint, uint, domain.ExportProfile) error
	SaveGradeRecord(context.Context, domain.GradeRecord) error
	ListGradeRecords(context.Context, uint) ([]domain.GradeRecord, error)
	GetGradeRecord(context.Context, uint, string) (*domain.GradeRecord, error)
	ListAIActivityEvents(context.Context, []uint, time.Time) ([]domain.AIActivityEvent, error)
	SavePerformanceRecord(context.Context, domain.PerformanceRecord) error
	ListPerformanceRecords(context.Context, uint) ([]domain.PerformanceRecord, error)
	GetPerformanceRecord(context.Context, uint, string) (*domain.PerformanceRecord, error)
	ListClassrooms(context.Context, uint, bool) ([]domain.Classroom, error)
	CreateClassroom(context.Context, domain.Classroom) (*domain.Classroom, error)
	GetClassroom(context.Context, string) (*domain.Classroom, error)
	GetOwnedClassroom(context.Context, string, uint) (*domain.Classroom, error)
	UpdateClassroom(context.Context, string, uint, string, string) error
	SetClassroomExperiment(context.Context, string, uint, string, bool) error
	DeleteClassroom(context.Context, string, uint) error
	ListClassroomStudents(context.Context, uint) ([]domain.Student, error)
	AddClassroomStudent(context.Context, uint, uint, string) error
	CreateClassroomStudentAccount(context.Context, uint, uint, UserImportRecord) error
	RemoveClassroomStudent(context.Context, uint, uint, string) error
	GetStudentClassroom(context.Context, uint) (*domain.Classroom, error)
	CreateQuiz(context.Context, domain.Quiz) (*domain.Quiz, error)
	ListQuizzes(context.Context, uint) ([]domain.Quiz, error)
	GetQuiz(context.Context, string) (*domain.Quiz, error)
	GetOwnedQuiz(context.Context, string, uint) (*domain.Quiz, error)
	UpdateQuizStatus(context.Context, string, uint, string) error
	ListStudentQuizzes(context.Context, uint, uint) ([]domain.Quiz, error)
	CreateQuizSubmission(context.Context, domain.QuizSubmission) error
	ListQuizSubmissions(context.Context, uint) ([]domain.QuizSubmission, error)
	CreateHomework(context.Context, domain.Homework) (*domain.Homework, error)
	ListHomeworks(context.Context, uint) ([]domain.Homework, error)
	GetHomework(context.Context, string) (*domain.Homework, error)
	ListHomeworkSubmissions(context.Context, uint, uint) ([]domain.HomeworkSubmission, error)
	CreateHomeworkSubmission(context.Context, domain.HomeworkSubmission) error
	ManageHomework(context.Context, uint, uint, string, time.Time, string) error
	CorrectHomework(context.Context, uint, uint, string, int, string) error
}
