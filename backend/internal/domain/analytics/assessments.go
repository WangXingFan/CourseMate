package analytics

import lab "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"

type Assessment struct {
	ID, ClassroomID, ClassroomName, ItemKey, Title string
	Expected, Started, Completed, ScoreCount       int64
	ScoreSum                                       float64
	Distribution                                   [5]int64 // <60, 60–69, 70–79, 80–89, 90–100
}

func (a *Assessment) AddScore(score float64) {
	a.Completed++
	a.ScoreCount++
	a.ScoreSum += score
	band := 0
	switch {
	case score >= 90:
		band = 4
	case score >= 80:
		band = 3
	case score >= 70:
		band = 2
	case score >= 60:
		band = 1
	}
	a.Distribution[band]++
}

// A complete lab report has a graded submission for each of its four tasks.
// Scores match the teacher report, including the latest teacher correction.
func LabCompletion(state lab.State, course string) (float64, bool) {
	ids := lab.TaskIDs(course)
	if len(ids) == 0 {
		return 0, false
	}
	total := 0.0
	for _, id := range ids {
		task := state.Tasks[id]
		if task == nil {
			return 0, false
		}
		submitted := false
		for _, attempt := range task.Attempts {
			if attempt.SubmittedAt != nil && attempt.Result != nil {
				submitted = true
				break
			}
		}
		if !submitted {
			return 0, false
		}
		_, _, _, score := task.Scores()
		total += score
	}
	return total, true
}

type LessonStats struct {
	QuizID, QuizTitle, ClassroomID, LessonID, Number, Title string
	Expected, Answered, Correct                             int64
}
