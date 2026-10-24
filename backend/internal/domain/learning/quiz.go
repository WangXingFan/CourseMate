package learning

import "time"

const QuizDuration = 90 * time.Second

const QuizQuestionsPerRound = 10

type QuizChapter struct {
	ID          string
	QuestionIDs []string
}

// Chapter IDs follow the four published course chapters, including the s-domain
// chapter renumbered from the original source material.
func QuizChapters() []QuizChapter {
	chapters := []QuizChapter{{ID: "1"}, {ID: "2"}, {ID: "3"}, {ID: "4"}}
	for _, q := range Questions() {
		for i := range chapters {
			if chapters[i].ID == q.ChapterID {
				chapters[i].QuestionIDs = append(chapters[i].QuestionIDs, q.ID)
			}
		}
	}
	return chapters
}

func FindQuizChapter(id string) *QuizChapter {
	for _, c := range QuizChapters() {
		if c.ID == id {
			return &c
		}
	}
	return nil
}

type QuizAnswer struct {
	QuestionID string
	Selected   int
	Correct    bool
}

type QuizRound struct {
	ID           string
	UserID       uint
	ChapterID    string
	BankVersion  string
	QuestionIDs  []string
	Answers      []QuizAnswer
	StartedAt    time.Time
	DeadlineAt   time.Time
	FinishedAt   *time.Time
	ElapsedMS    int64
	Score        int
	CorrectCount int
	BestStreak   int
}

func (r *QuizRound) Finish(now time.Time) {
	if r.FinishedAt != nil {
		return
	}
	if now.After(r.DeadlineAt) {
		now = r.DeadlineAt
	}
	r.ElapsedMS = max(0, now.Sub(r.StartedAt).Milliseconds())
	r.FinishedAt = &now
}

func (r *QuizRound) RecalculateScore() {
	r.Score, r.CorrectCount, r.BestStreak = 0, 0, 0
	streak := 0
	for _, a := range r.Answers {
		if !a.Correct {
			streak = 0
			continue
		}
		r.Score += 10 + min(streak, 5)*2
		streak++
		r.CorrectCount++
		r.BestStreak = max(r.BestStreak, streak)
	}
}

type QuizRanking struct {
	Rank          int
	Name          string
	Score         int
	ElapsedMS     int64
	IsCurrentUser bool
}
