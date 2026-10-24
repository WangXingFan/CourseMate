package classroom

import "github.com/gin-gonic/gin"

// Module 聚合班级 HTTP 处理器。
type Module struct {
	Handler *Handler
}

func NewModule(handler *Handler) *Module {
	return &Module{Handler: handler}
}

// RegisterRoutes 注册教师班级管理路由。
func (m *Module) RegisterRoutes(group *gin.RouterGroup) {
	group.GET("/classrooms", m.Handler.ListClassrooms)
	group.POST("/classrooms", m.Handler.CreateClassroom)
	group.PATCH("/classrooms/:id", m.Handler.UpdateClassroom)
	group.DELETE("/classrooms/:id", m.Handler.DeleteClassroom)
	group.GET("/classrooms/:id/students", m.Handler.ListStudents)
	group.POST("/classrooms/:id/students", m.Handler.AddStudent)
	group.POST("/classrooms/:id/students/accounts", m.Handler.CreateStudentAccount)
	group.POST("/classrooms/:id/students/accounts/import", m.Handler.ImportStudentAccounts)
	group.DELETE("/classrooms/:id/students/:student_id", m.Handler.RemoveStudent)
	group.GET("/classrooms/:id/quizzes", m.Handler.ListQuizzes)
	group.GET("/classrooms/:id/quiz-lessons", m.Handler.ListQuizLessons)
	group.POST("/classrooms/:id/quizzes", m.Handler.CreateQuiz)
	group.POST("/quizzes/:id/open", m.Handler.OpenQuiz)
	group.POST("/quizzes/:id/close", m.Handler.CloseQuiz)
	group.GET("/quizzes/:id/submissions", m.Handler.QuizReport)
	group.POST("/quizzes/:id/submissions", m.Handler.SubmitQuiz)
	group.GET("/student/quizzes", m.Handler.StudentQuizzes)
}
