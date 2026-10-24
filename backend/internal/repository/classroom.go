package repository

import (
	"context"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
)

type ClassroomRepository interface {
	ListClassrooms(context.Context, uint, bool) ([]domain.Classroom, error)
	CreateClassroom(context.Context, domain.Classroom) (*domain.Classroom, error)
	GetClassroom(context.Context, string) (*domain.Classroom, error)
	GetOwnedClassroom(context.Context, string, uint) (*domain.Classroom, error)
	UpdateClassroom(context.Context, string, uint, string, string) error
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
}
