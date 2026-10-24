package learning

import (
	"net/http"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type QuizChapter struct {
	ID          string   `json:"id"`
	QuestionIDs []string `json:"questionIds"`
	RoundSize   int      `json:"roundSize"`
}
type QuizAnswer struct {
	QuestionID string `json:"questionId"`
	Selected   int    `json:"selected"`
	Correct    bool   `json:"correct"`
}
type QuizRound struct {
	ID           string       `json:"id"`
	ChapterID    string       `json:"chapterId"`
	QuestionIDs  []string     `json:"questionIds"`
	Answers      []QuizAnswer `json:"answers"`
	StartedAt    time.Time    `json:"startedAt"`
	DeadlineAt   time.Time    `json:"deadlineAt"`
	FinishedAt   *time.Time   `json:"finishedAt" extensions:"x-nullable"`
	ElapsedMS    int64        `json:"elapsedMs"`
	Score        int          `json:"score"`
	CorrectCount int          `json:"correctCount"`
	BestStreak   int          `json:"bestStreak"`
}
type QuizRanking struct {
	Rank          int    `json:"rank"`
	Name          string `json:"name"`
	Score         int    `json:"score"`
	ElapsedMS     int64  `json:"elapsedMs"`
	IsCurrentUser bool   `json:"isCurrentUser"`
}

type LearningQuizCatalogResponse struct {
	Chapters []QuizChapter `json:"chapters"`
}
type LearningQuizRoundResponse struct {
	Round      QuizRound `json:"round"`
	ServerTime string    `json:"serverTime"`
}
type LearningQuizLeaderboardResponse struct {
	Rankings []QuizRanking `json:"rankings"`
}
type LearningQuizStartRequest struct {
	ID        string `json:"id" binding:"required,uuid"`
	ChapterID string `json:"chapterId" binding:"required,max=8"`
}
type LearningQuizAnswerRequest struct {
	QuestionID string `json:"questionId" binding:"required,max=64"`
	Selected   *int   `json:"selected" binding:"required,min=0,max=3"`
}

// QuizCatalog godoc
// @Summary Read chapter question sets for timed quizzes
// @Tags learning
// @Security BearerAuth
// @Produce json
// @Success 200 {object} LearningQuizCatalogResponse
// @Router /learning/quiz/chapters [get]
func (m *Module) QuizCatalog(c *gin.Context) {
	chapters := make([]QuizChapter, 0)
	for _, chapter := range domain.QuizChapters() {
		chapters = append(chapters, QuizChapter{ID: chapter.ID, QuestionIDs: chapter.QuestionIDs, RoundSize: min(domain.QuizQuestionsPerRound, len(chapter.QuestionIDs))})
	}
	response.Success(c, LearningQuizCatalogResponse{Chapters: chapters})
}

// StartQuiz godoc
// @Summary Start an account-owned timed chapter quiz (idempotent)
// @Tags learning
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param body body LearningQuizStartRequest true "Chapter and retry ID"
// @Success 200 {object} LearningQuizRoundResponse
// @Router /learning/quiz/rounds [post]
func (m *Module) StartQuiz(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var input LearningQuizStartRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	round, err := m.service.StartQuiz(c.Request.Context(), middleware.MustUserID(c), input.ID, input.ChapterID)
	m.quizResponse(c, round, err)
}

// AnswerQuiz godoc
// @Summary Grade a chapter quiz answer and save personal practice history
// @Tags learning
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "Round ID"
// @Param body body LearningQuizAnswerRequest true "Answer"
// @Success 200 {object} LearningQuizRoundResponse
// @Router /learning/quiz/rounds/{id}/answers [post]
func (m *Module) AnswerQuiz(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var input LearningQuizAnswerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	round, err := m.service.AnswerQuiz(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), input.QuestionID, *input.Selected)
	m.quizResponse(c, round, err)
}

// FinishQuiz godoc
// @Summary Finish a chapter quiz with server-measured elapsed time
// @Tags learning
// @Security BearerAuth
// @Produce json
// @Param id path string true "Round ID"
// @Success 200 {object} LearningQuizRoundResponse
// @Router /learning/quiz/rounds/{id}/finish [post]
func (m *Module) FinishQuiz(c *gin.Context) {
	round, err := m.service.FinishQuiz(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	m.quizResponse(c, round, err)
}

// QuizLeaderboard godoc
// @Summary Read the best result per student for a chapter, score descending then elapsed time ascending
// @Tags learning
// @Security BearerAuth
// @Produce json
// @Param chapterId query string true "Chapter ID"
// @Success 200 {object} LearningQuizLeaderboardResponse
// @Router /learning/quiz/leaderboard [get]
func (m *Module) QuizLeaderboard(c *gin.Context) {
	items, err := m.service.QuizLeaderboard(c.Request.Context(), middleware.MustUserID(c), c.Query("chapterId"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	rankings := make([]QuizRanking, 0, len(items))
	for _, item := range items {
		rankings = append(rankings, QuizRanking{Rank: item.Rank, Name: item.Name, Score: item.Score, ElapsedMS: item.ElapsedMS, IsCurrentUser: item.IsCurrentUser})
	}
	response.Success(c, LearningQuizLeaderboardResponse{Rankings: rankings})
}

func (m *Module) quizResponse(c *gin.Context, round *domain.QuizRound, err error) {
	if err != nil {
		writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	answers := make([]QuizAnswer, 0, len(round.Answers))
	for _, answer := range round.Answers {
		answers = append(answers, QuizAnswer{QuestionID: answer.QuestionID, Selected: answer.Selected, Correct: answer.Correct})
	}
	view := QuizRound{ID: round.ID, ChapterID: round.ChapterID, QuestionIDs: round.QuestionIDs, Answers: answers, StartedAt: round.StartedAt, DeadlineAt: round.DeadlineAt, FinishedAt: round.FinishedAt, ElapsedMS: round.ElapsedMS, Score: round.Score, CorrectCount: round.CorrectCount, BestStreak: round.BestStreak}
	response.Success(c, LearningQuizRoundResponse{Round: view, ServerTime: time.Now().UTC().Format(time.RFC3339Nano)})
}
