package classroom

import (
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	learning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"strings"
)

func quizPhase(value string) (string, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		value = domain.QuizPhasePreClass
	}
	return value, value == domain.QuizPhasePreClass || value == domain.QuizPhaseInClass || value == domain.QuizPhaseAfterClass
}

// Question accuracy and paired comparisons require every blank to be correct.
func quizAnswer(sub domain.QuizSubmission, index int, q domain.QuizQuestion) (correct, valid bool) {
	score, total, valid := quizAnswerScore(sub, index, q)
	return valid && score == total, valid
}

// Preserve the course's independent credit for each numeric blank.
func quizAnswerScore(sub domain.QuizSubmission, index int, q domain.QuizQuestion) (score, total int, valid bool) {
	if len(q.Options) > 0 {
		if index >= len(sub.Answers) || sub.Answers[index] < 0 || sub.Answers[index] >= len(q.Options) {
			return 0, 1, false
		}
		if sub.Answers[index] == q.Answer {
			return 1, 1, true
		}
		return 0, 1, true
	}
	if len(q.Fields) == 0 {
		return 0, 0, false
	}
	question := learning.CourseQuestion{}
	for _, field := range q.Fields {
		question.Fields = append(question.Fields, learning.CourseField{ID: field.ID, Expected: field.Expected})
	}
	_, score, valid = learning.GradeCourseQuestion(question, sub.FieldAnswers[q.ID])
	return score, len(q.Fields), valid
}
