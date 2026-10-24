package classroom

import (
	"context"
	"errors"
	"strings"
	"unicode/utf8"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domainlearning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
)

const (
	quizTitleMaxLength = 120
	quizMaxQuestions   = 10
)

// QuizSubmissionResult reports the outcome of one student's submission.
type QuizSubmissionResult struct {
	Score     int
	Total     int
	Submitted bool
}

// QuizQuestionStatistics aggregates option choices for one question.
type QuizQuestionStatistics struct {
	Question     domain.QuizQuestion
	OptionCounts []int
	CorrectCount int
}

// QuizReport is the teacher-facing view of a quiz and its submissions.
type QuizReport struct {
	Quiz            domain.Quiz
	Students        []domain.Student
	Submissions     []domain.QuizSubmission
	Missing         []domain.Student
	StudentCount    int
	SubmissionCount int
	AverageScore    float64
	Comparison      *QuizComparison
	Questions       []QuizQuestionStatistics
}

func previewQuestion(lesson *domainlearning.CourseLesson) *domainlearning.CourseQuestion {
	if lesson != nil {
		for index := range lesson.Questions {
			question := &lesson.Questions[index]
			if question.Stage == "preview" && len(question.Options) >= 2 {
				return question
			}
		}
	}
	return nil
}

// QuizLessons lists the built-in preview questions for a teacher's classroom.
func (s *Service) QuizLessons(ctx context.Context, actor uint, classroomPublicID string) ([]domain.QuizLesson, error) {
	if _, err := s.owned(ctx, actor, classroomPublicID); err != nil {
		return nil, err
	}
	practiceLessons := domainlearning.PracticeCourseLessons()
	items := make([]domain.QuizLesson, 0, len(practiceLessons))
	for _, lesson := range practiceLessons {
		if question := previewQuestion(&lesson); question != nil {
			items = append(items, domain.QuizLesson{
				ID: lesson.ID, Number: lesson.Number, Title: lesson.Title, Chapter: lesson.Chapter,
				Prompt: question.Prompt, Options: append([]string(nil), question.Options...),
				Answer: question.Answer, Explanation: question.Explanation, Followup: pairedSnapshot(lesson.ID, question).Followup,
			})
		}
	}
	return items, nil
}

// Quizzes lists every quiz in a classroom the teacher owns.
func (s *Service) Quizzes(ctx context.Context, actor uint, classroomPublicID string) ([]domain.Quiz, error) {
	item, err := s.owned(ctx, actor, classroomPublicID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListQuizzes(ctx, item.ID)
}

// CreateQuiz snapshots built-in preview questions; publishing is a separate action.
func (s *Service) CreateQuiz(
	ctx context.Context,
	actor uint,
	classroomPublicID, title string,
	lessonIDs []string,
) (*domain.Quiz, error) {
	item, err := s.owned(ctx, actor, classroomPublicID)
	if err != nil {
		return nil, err
	}
	title = strings.TrimSpace(title)
	if title == "" || utf8.RuneCountInString(title) > quizTitleMaxLength || len(lessonIDs) == 0 || len(lessonIDs) > quizMaxQuestions {
		return nil, ErrQuizInvalid
	}
	questions := make([]domain.QuizQuestion, 0, len(lessonIDs))
	seen := make(map[string]bool, len(lessonIDs))
	for _, rawID := range lessonIDs {
		lessonID := strings.TrimSpace(rawID)
		question := previewQuestion(domainlearning.FindPracticeCourseLesson(lessonID))
		if seen[lessonID] || question == nil {
			return nil, ErrQuizInvalid
		}
		seen[lessonID] = true
		questions = append(questions, pairedSnapshot(lessonID, question))
	}
	return s.repo.CreateQuiz(ctx, domain.Quiz{
		PublicID:    strings.ReplaceAll(uuid.NewString(), "-", ""),
		ClassroomID: item.ID,
		TeacherID:   actor,
		Title:       title,
		Phase:       domain.QuizPhasePreClass,
		Status:      domain.QuizStatusDraft,
		Questions:   questions,
	})
}

func (s *Service) ownedQuiz(ctx context.Context, actor uint, publicID string) (*domain.Quiz, error) {
	if err := s.teacher(ctx, actor); err != nil {
		return nil, err
	}
	item, err := s.repo.GetOwnedQuiz(ctx, strings.TrimSpace(publicID), actor)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrQuizNotFound
	}
	return item, err
}

// OpenQuiz publishes a quiz so students in the classroom can answer it.
func (s *Service) OpenQuiz(ctx context.Context, actor uint, publicID string) error {
	quiz, err := s.ownedQuiz(ctx, actor, publicID)
	if err != nil {
		return err
	}
	if quiz.SourceQuizID != "" {
		parent, e := s.ownedQuiz(ctx, actor, quiz.SourceQuizID)
		if e != nil {
			return e
		}
		if parent.Status != domain.QuizStatusClosed {
			return ErrQuizInvalid
		}
	} else {
		followup, e := s.findFollowup(ctx, *quiz)
		if e != nil {
			return e
		}
		if followup != nil {
			return ErrQuizInvalid
		}
	}
	err = s.repo.UpdateQuizStatus(ctx, strings.TrimSpace(publicID), actor, domain.QuizStatusOpen)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrQuizNotFound
	}
	if errors.Is(err, repository.ErrInvalidInput) {
		return ErrQuizInvalid
	}
	return err
}

// CloseQuiz stops accepting submissions.
func (s *Service) CloseQuiz(ctx context.Context, actor uint, publicID string) error {
	if _, err := s.ownedQuiz(ctx, actor, publicID); err != nil {
		return err
	}
	err := s.repo.UpdateQuizStatus(ctx, strings.TrimSpace(publicID), actor, domain.QuizStatusClosed)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrQuizNotFound
	}
	if errors.Is(err, repository.ErrInvalidInput) {
		return ErrQuizInvalid
	}
	return err
}

// StudentQuizzes returns the open quizzes for the classroom the student joined.
// Correct answers are stripped before the value leaves the application layer.
func (s *Service) StudentQuizzes(ctx context.Context, actor uint) (*domain.Classroom, []domain.Quiz, error) {
	user, err := s.actor(ctx, actor)
	if err != nil {
		return nil, nil, err
	}
	if user.Role != domainuser.RoleStudent {
		return nil, nil, ErrForbidden
	}
	classroom, err := s.repo.GetStudentClassroom(ctx, actor)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, nil, ErrNotInClassroom
	}
	if err != nil {
		return nil, nil, err
	}
	items, err := s.repo.ListStudentQuizzes(ctx, classroom.ID, actor)
	if err != nil {
		return nil, nil, err
	}
	for index := range items {
		for questionIndex := range items[index].Questions {
			items[index].Questions[questionIndex].Answer = -1
			items[index].Questions[questionIndex].Explanation = ""
			items[index].Questions[questionIndex].Followup = nil
		}
	}
	return classroom, items, nil
}

// SubmitQuiz records one student's answers. A student may submit once per quiz.
func (s *Service) SubmitQuiz(
	ctx context.Context,
	actor uint,
	publicID string,
	answers []int,
) (*QuizSubmissionResult, error) {
	user, err := s.actor(ctx, actor)
	if err != nil {
		return nil, err
	}
	if user.Role != domainuser.RoleStudent {
		return nil, ErrForbidden
	}
	classroom, err := s.repo.GetStudentClassroom(ctx, actor)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotInClassroom
	}
	if err != nil {
		return nil, err
	}
	quiz, err := s.repo.GetQuiz(ctx, strings.TrimSpace(publicID))
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrQuizNotFound
	}
	if err != nil {
		return nil, err
	}
	if quiz.ClassroomID != classroom.ID {
		return nil, ErrQuizNotFound
	}
	if quiz.Status != domain.QuizStatusOpen {
		return nil, ErrQuizClosed
	}
	if len(answers) != len(quiz.Questions) {
		return nil, ErrQuizInvalid
	}
	score := 0
	for index, answer := range answers {
		if answer < 0 || answer >= len(quiz.Questions[index].Options) {
			return nil, ErrQuizInvalid
		}
		if answer == quiz.Questions[index].Answer {
			score++
		}
	}
	err = s.repo.CreateQuizSubmission(ctx, domain.QuizSubmission{
		QuizID:    quiz.ID,
		StudentID: actor,
		Answers:   append([]int(nil), answers...),
		Score:     score,
	})
	if errors.Is(err, repository.ErrConflict) || errors.Is(err, repository.ErrDuplicate) {
		return nil, ErrQuizSubmitted
	}
	if err != nil {
		return nil, err
	}
	return &QuizSubmissionResult{Score: score, Total: len(quiz.Questions), Submitted: true}, nil
}

// QuizReport builds the teacher statistics view, including missing students.
func (s *Service) QuizReport(ctx context.Context, actor uint, publicID string) (*QuizReport, error) {
	quiz, err := s.ownedQuiz(ctx, actor, publicID)
	if err != nil {
		return nil, err
	}
	students, err := s.repo.ListClassroomStudents(ctx, quiz.ClassroomID)
	if err != nil {
		return nil, err
	}
	submissions, err := s.repo.ListQuizSubmissions(ctx, quiz.ID)
	if err != nil {
		return nil, err
	}
	submitted := make(map[string]struct{}, len(submissions))
	totalScore := 0
	for _, submission := range submissions {
		submitted[submission.StudentPublicID] = struct{}{}
		totalScore += submission.Score
	}
	missing := make([]domain.Student, 0)
	for _, student := range students {
		if _, ok := submitted[student.PublicID]; !ok {
			missing = append(missing, student)
		}
	}
	questions := make([]QuizQuestionStatistics, 0, len(quiz.Questions))
	for questionIndex, question := range quiz.Questions {
		options := make([]int, len(question.Options))
		correct := 0
		for _, submission := range submissions {
			if questionIndex >= len(submission.Answers) {
				continue
			}
			answer := submission.Answers[questionIndex]
			if answer >= 0 && answer < len(options) {
				options[answer]++
			}
			if answer == question.Answer {
				correct++
			}
		}
		questions = append(questions, QuizQuestionStatistics{
			Question:     question,
			OptionCounts: options,
			CorrectCount: correct,
		})
	}
	average := 0.0
	if len(submissions) > 0 {
		average = float64(totalScore) / float64(len(submissions))
	}
	comparison, err := s.quizComparison(ctx, actor, *quiz, students)
	if err != nil {
		return nil, err
	}
	return &QuizReport{
		Comparison:      comparison,
		Quiz:            *quiz,
		Students:        students,
		Submissions:     submissions,
		Missing:         missing,
		StudentCount:    len(students),
		SubmissionCount: len(submissions),
		AverageScore:    average,
		Questions:       questions,
	}, nil
}
