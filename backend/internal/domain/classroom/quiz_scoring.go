package classroom

import learning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"

// Preserve the course's independent credit for each numeric blank.
func QuizAnswerScore(sub QuizSubmission, index int, q QuizQuestion) (score, total int, valid bool) {
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
