package classroom

import (
	"strings"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
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

func quizAnswerScore(sub domain.QuizSubmission, index int, q domain.QuizQuestion) (int, int, bool) {
	return domain.QuizAnswerScore(sub, index, q)
}
