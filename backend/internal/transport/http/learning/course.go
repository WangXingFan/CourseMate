package learning

import (
	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/learning"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

// Course godoc
// @Summary Read the course catalog; standalone practice is limited to teaching previews
// @Tags learning
// @Produce json
// @Security BearerAuth
// @Success 200 {object} LearningCourseResponse
// @Failure 401 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /learning/course [get]
func (m *Module) Course(c *gin.Context) {
	canPractice := app.CanPracticeCourse(middleware.MustUserRole(c))
	var attempts []domain.LessonAttempt
	if canPractice {
		var err error
		attempts, err = m.service.LessonProgress(c.Request.Context(), middleware.MustUserID(c))
		if err != nil {
			writeError(c, err)
			return
		}
	}
	catalog := domain.CourseCatalog()
	view := LearningCourseResponse{CanPractice: canPractice, ID: catalog.ID, Version: catalog.Version, Title: catalog.Title, Language: catalog.Language, SourceName: catalog.SourceName, Lessons: make([]LearningCourseLessonSummary, 0, len(catalog.Lessons))}
	for _, lesson := range catalog.Lessons {
		view.Lessons = append(view.Lessons, lessonSummary(lesson, attempts))
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, view)
}

// CourseLesson godoc
// @Summary Read lesson notes; students receive no standalone questions or answer keys
// @Tags learning
// @Produce json
// @Security BearerAuth
// @Param id path string true "Stable knowledge lesson ID"
// @Success 200 {object} LearningCourseLessonResponse
// @Failure 400 {object} response.Envelope
// @Failure 401 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /learning/lessons/{id} [get]
func (m *Module) CourseLesson(c *gin.Context) {
	lesson := domain.FindCourseLesson(c.Param("id"))
	if lesson == nil {
		writeError(c, app.ErrInvalid)
		return
	}
	canPractice := app.CanPracticeCourse(middleware.MustUserRole(c))
	var attempts []domain.LessonAttempt
	if canPractice {
		var err error
		attempts, err = m.service.LessonProgress(c.Request.Context(), middleware.MustUserID(c))
		if err != nil {
			writeError(c, err)
			return
		}
	}
	view := LearningCourseLessonResponse{CanPractice: canPractice, Version: domain.CourseCatalog().Version, Lesson: lessonSummary(*lesson, attempts), Markdown: lesson.Markdown,
		Questions: make([]LearningCourseQuestion, 0, len(lesson.Questions)), Attempts: make([]LearningLessonAttemptResponse, 0)}
	questions := lesson.Questions
	if !canPractice {
		questions = nil
	}
	for _, question := range questions {
		fields := make([]LearningCourseField, 0, len(question.Fields))
		for _, field := range question.Fields {
			fields = append(fields, LearningCourseField{ID: field.ID, Label: field.Label, Unit: field.Unit})
		}
		view.Questions = append(view.Questions, LearningCourseQuestion{ID: question.ID, Stage: question.Stage, Prompt: question.Prompt, Options: question.Options, Formula: question.Formula, Fields: fields})
	}
	for _, attempt := range attempts {
		if attempt.LessonID == lesson.ID {
			view.Attempts = append(view.Attempts, lessonAttemptResponse(attempt))
		}
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, view)
}

// SubmitLesson godoc
// @Summary Grade and save a staged answer with partial credit and idempotent retries
// @Tags learning
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body LearningLessonAttemptRequest true "Numeric blanks or choice answer"
// @Success 200 {object} LearningLessonAttemptResponse
// @Failure 400 {object} response.Envelope
// @Failure 401 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 409 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /learning/lesson-attempts [post]
func (m *Module) SubmitLesson(c *gin.Context) {
	role := middleware.MustUserRole(c)
	if !app.CanPracticeCourse(role) {
		writeError(c, app.ErrCourseAssigned)
		return
	}
	var input LearningLessonAttemptRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	attempt, err := m.service.SubmitLesson(c.Request.Context(), middleware.MustUserID(c), role, input.ID, input.LessonID, input.QuestionID, input.Version, input.Answers)
	if err != nil {
		writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, lessonAttemptResponse(*attempt))
}

func lessonSummary(lesson domain.CourseLesson, attempts []domain.LessonAttempt) LearningCourseLessonSummary {
	view := LearningCourseLessonSummary{ID: lesson.ID, Number: lesson.Number, Title: lesson.Title, Chapter: lesson.Chapter}
	for _, attempt := range attempts {
		if attempt.LessonID != lesson.ID {
			continue
		}
		view.CompletedStages++
		if attempt.Score == attempt.Total {
			view.MasteredStages++
		}
	}
	return view
}

func lessonAttemptResponse(item domain.LessonAttempt) LearningLessonAttemptResponse {
	results := make([]LearningLessonFieldResult, 0, len(item.Results))
	for _, result := range item.Results {
		results = append(results, LearningLessonFieldResult{ID: result.ID, Correct: result.Correct, Expected: result.Expected})
	}
	return LearningLessonAttemptResponse{ID: item.ID, Version: item.Version, LessonID: item.LessonID, QuestionID: item.QuestionID, Stage: item.Stage, Answers: item.Answers,
		Score: item.Score, Total: item.Total, Results: results, Explanation: item.Explanation, CreatedAt: item.CreatedAt}
}
