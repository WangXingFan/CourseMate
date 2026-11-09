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
	group.GET("/classrooms/:id/ai-activity", m.Handler.AIActivity)
	group.GET("/student/ai-activity", m.Handler.StudentAIActivity)
	group.POST("/classrooms/:id/performance/preview", m.Handler.PreviewPerformance)
	group.GET("/classrooms/:id/performance/records", m.Handler.PerformanceRecords)
	group.POST("/classrooms/:id/performance/records", m.Handler.FinalizePerformance)
	group.GET("/classrooms/:id/performance/records/:record_id", m.Handler.PerformanceRecord)
	group.GET("/student/performance", m.Handler.StudentPerformance)
	group.GET("/classrooms/:id/homework-bank", m.Handler.HomeworkBank)
	group.GET("/classrooms/:id/homeworks", m.Handler.Homeworks)
	group.POST("/classrooms/:id/homeworks", m.Handler.PublishHomework)
	group.GET("/student/homeworks", m.Handler.StudentHomeworks)
	group.POST("/homeworks/:id/submissions", m.Handler.SubmitHomework)
	group.GET("/homeworks/:id/report", m.Handler.HomeworkReport)
	group.PATCH("/homeworks/:id/deadline", m.Handler.ExtendHomeworkDeadline)
	group.GET("/classrooms/:id/practice-candidates", m.Handler.PracticeCandidates)
	group.GET("/classrooms/:id/practice-assignments", m.Handler.PracticeAssignments)
	group.POST("/classrooms/:id/practice-assignments", m.Handler.PublishPractice)
	group.GET("/student/practice-assignments", m.Handler.StudentPracticeAssignments)
	group.POST("/practice-assignments/:id/submissions", m.Handler.SubmitAssignedPractice)
	group.GET("/classrooms", m.Handler.ListClassrooms)
	group.GET("/classrooms/:id/mastery", m.Handler.MasteryReport)
	group.GET("/classrooms/:id/students/:student_id/mastery", m.Handler.StudentMastery)
	group.POST("/classrooms", m.Handler.CreateClassroom)
	group.PATCH("/classrooms/:id", m.Handler.UpdateClassroom)
	group.PUT("/classrooms/:id/experiments/:course_id", m.Handler.SetExperiment)
	group.DELETE("/classrooms/:id", m.Handler.DeleteClassroom)
	group.GET("/classrooms/:id/students", m.Handler.ListStudents)
	group.POST("/classrooms/:id/students", m.Handler.AddStudent)
	group.POST("/classrooms/:id/students/accounts", m.Handler.CreateStudentAccount)
	group.POST("/classrooms/:id/students/accounts/import", m.Handler.ImportStudentAccounts)
	group.POST("/classrooms/:id/students/accounts/import/file", m.Handler.ImportStudentAccountsFile)
	group.DELETE("/classrooms/:id/students/:student_id", m.Handler.RemoveStudent)
	group.GET("/classrooms/:id/quizzes", m.Handler.ListQuizzes)
	group.GET("/classrooms/:id/quiz-lessons", m.Handler.ListQuizLessons)
	group.POST("/classrooms/:id/quizzes", m.Handler.CreateQuiz)
	group.POST("/quizzes/:id/open", m.Handler.OpenQuiz)
	group.POST("/quizzes/:id/close", m.Handler.CloseQuiz)
	group.GET("/quizzes/:id/submissions", m.Handler.QuizReport)
	group.POST("/quizzes/:id/followup", m.Handler.CreateQuizFollowup)
	group.POST("/quizzes/:id/submissions", m.Handler.SubmitQuiz)
	group.GET("/student/quizzes", m.Handler.StudentQuizzes)
}
