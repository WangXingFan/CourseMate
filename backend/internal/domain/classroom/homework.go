package classroom

import (
	_ "embed"
	"encoding/json"
	"math/big"
	"strings"
	"time"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

//go:embed content/homework-bank.json
var homeworkBankJSON []byte

type HomeworkQuestion struct {
	ID          string
	Kind        string
	Prompt      string
	Options     []string
	Points      int
	Accepted    [][]string
	Explanation string
}

type HomeworkPaper struct {
	ID        string
	Title     string
	Source    string
	Questions []HomeworkQuestion
}

// Each call returns a fresh copy so student redaction never mutates the bank.
func HomeworkBank() []HomeworkPaper {
	var papers []HomeworkPaper
	if err := json.Unmarshal(homeworkBankJSON, &papers); err != nil {
		panic(err)
	}
	return papers
}

type Homework struct {
	ID              uint
	PublicID        string
	ClassroomID     uint
	TeacherID       uint
	BankID          string
	Title           string
	Questions       []HomeworkQuestion
	StartsAt        time.Time
	Deadline        time.Time
	CreatedAt       time.Time
	SubmissionCount int64
}

func (h Homework) Status(now time.Time) string {
	if now.Before(h.StartsAt) {
		return "scheduled"
	}
	if !now.Before(h.Deadline) {
		return "closed"
	}
	return "open"
}

// AppliesTo excludes assignments that ended before the current enrollment.
func (h Homework) AppliesTo(joinedAt time.Time) bool {
	return joinedAt.IsZero() || h.Deadline.After(joinedAt)
}

func (h Homework) Total() int {
	total := 0
	for _, q := range h.Questions {
		total += q.Points
	}
	return total
}

type HomeworkResult struct {
	QuestionID string
	Score      int
	Total      int
	Correct    []bool
}

type HomeworkSubmission struct {
	ID              uint
	HomeworkID      uint
	StudentID       uint
	StudentPublicID string
	StudentName     string
	Username        string
	Answers         [][]string
	Results         []HomeworkResult
	Score           int
	SubmittedAt     time.Time
}

func normalizeHomeworkAnswer(value string) string {
	value = strings.ToLower(norm.NFKC.String(value))
	value = strings.NewReplacer(`\left`, "", `\right`, "", `\cos`, "cos", `\omega`, "w", "ω", "w", `\cdot`, "*", `\times`, "*", `\,`, "", `\!`, "", "$", "", "×", "*", "·", "*", "−", "-", "{", "(", "}", ")").Replace(value)
	return strings.Map(func(r rune) rune {
		if unicode.IsSpace(r) {
			return -1
		}
		return r
	}, value)
}

func homeworkAnswerMatches(answer, expected string) bool {
	a, b := normalizeHomeworkAnswer(answer), normalizeHomeworkAnswer(expected)
	if a == b {
		return true
	}
	// Decimal and rational forms of numeric blanks (e.g. 26.0 and 52/2).
	x, ok := new(big.Rat).SetString(a)
	y, valid := new(big.Rat).SetString(b)
	if valid {
		return ok && x.Cmp(y) == 0
	}
	return strings.ReplaceAll(a, "*", "") == strings.ReplaceAll(b, "*", "")
}

// GradeHomework returns false for malformed/incomplete submissions. Each blank
// receives an equal share of its question's points, as in the imported papers.
func GradeHomework(questions []HomeworkQuestion, answers [][]string) ([]HomeworkResult, int, bool) {
	if len(answers) != len(questions) {
		return nil, 0, false
	}
	results := make([]HomeworkResult, 0, len(questions))
	total := 0
	for i, q := range questions {
		if len(answers[i]) != len(q.Accepted) || len(q.Accepted) == 0 {
			return nil, 0, false
		}
		result := HomeworkResult{QuestionID: q.ID, Total: q.Points, Correct: make([]bool, len(q.Accepted))}
		for blank, aliases := range q.Accepted {
			answer := strings.TrimSpace(answers[i][blank])
			if answer == "" || len(answer) > 200 {
				return nil, 0, false
			}
			if q.Kind != "blank" {
				valid := false
				for option := range q.Options {
					if answer == string(rune('0'+option)) {
						valid = true
					}
				}
				if !valid {
					return nil, 0, false
				}
			}
			for _, expected := range aliases {
				if homeworkAnswerMatches(answer, expected) {
					result.Correct[blank] = true
					result.Score += q.Points / len(q.Accepted)
					break
				}
			}
		}
		total += result.Score
		results = append(results, result)
	}
	return results, total, true
}
