package learning

import (
	_ "embed"
	"encoding/json"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"
)

//go:embed content/course.json
var courseJSON []byte

type Course struct {
	ID         string         `json:"id"`
	Version    string         `json:"version"`
	Title      string         `json:"title"`
	Language   string         `json:"language"`
	SourceName string         `json:"sourceName"`
	SourceHash string         `json:"sourceHash"`
	Lessons    []CourseLesson `json:"lessons"`
}

type CourseLesson struct {
	ID        string           `json:"id"`
	Number    string           `json:"number"`
	Title     string           `json:"title"`
	Chapter   string           `json:"chapter"`
	Markdown  string           `json:"markdown"`
	Questions []CourseQuestion `json:"questions"`
}

// CourseQuestion contains private grading data. HTTP must project public fields.
type CourseQuestion struct {
	ID          string        `json:"id"`
	Stage       string        `json:"stage"`
	Prompt      string        `json:"prompt"`
	Options     []string      `json:"options"`
	Answer      int           `json:"answer"`
	Formula     string        `json:"formula"`
	Fields      []CourseField `json:"fields"`
	Explanation string        `json:"explanation"`
}

type CourseField struct {
	ID       string  `json:"id"`
	Label    string  `json:"label"`
	Unit     string  `json:"unit"`
	Expected float64 `json:"expected"`
}

var course = func() Course {
	var value Course
	if err := json.Unmarshal(courseJSON, &value); err != nil {
		panic(err)
	}
	return value
}()

// CourseCatalog returns trusted embedded content; callers must not mutate it.
func CourseCatalog() *Course { return &course }

func FindCourseLesson(id string) *CourseLesson {
	for i := range course.Lessons {
		if course.Lessons[i].ID == id {
			return &course.Lessons[i]
		}
	}
	return nil
}

type LessonFieldResult struct {
	ID       string `json:"id"`
	Correct  bool   `json:"correct"`
	Expected string `json:"expected"`
}

type LessonAttempt struct {
	ID          string              `json:"id"`
	UserID      uint                `json:"-"`
	Version     string              `json:"version"`
	LessonID    string              `json:"lessonId"`
	QuestionID  string              `json:"questionId"`
	Stage       string              `json:"stage"`
	Answers     map[string]string   `json:"answers"`
	Score       int                 `json:"score"`
	Total       int                 `json:"total"`
	Results     []LessonFieldResult `json:"results"`
	Explanation string              `json:"explanation"`
	CreatedAt   time.Time           `json:"createdAt"`
}

// ParseCourseNumber accepts decimal/scientific numbers and one numeric fraction.
// It never evaluates code, symbolic expressions or LaTeX. Invalid input is not graded.
var courseNumberPattern = regexp.MustCompile(`^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`)

func ParseCourseNumber(input string) (float64, bool) {
	input = strings.TrimSpace(strings.ReplaceAll(input, "−", "-"))
	if len(input) == 0 || len(input) > 64 {
		return 0, false
	}
	parts := strings.Split(input, "/")
	if len(parts) > 2 {
		return 0, false
	}
	parse := func(part string) (float64, bool) {
		part = strings.TrimSpace(part)
		if !courseNumberPattern.MatchString(part) {
			return 0, false
		}
		n, err := strconv.ParseFloat(part, 64)
		return n, err == nil && !math.IsNaN(n) && !math.IsInf(n, 0) && math.Abs(n) <= 1e12
	}
	value, ok := parse(parts[0])
	if !ok {
		return 0, false
	}
	if len(parts) == 2 {
		denominator, valid := parse(parts[1])
		if !valid || denominator == 0 {
			return 0, false
		}
		value /= denominator
	}
	return value, !math.IsNaN(value) && !math.IsInf(value, 0) && math.Abs(value) <= 1e12
}

func GradeCourseQuestion(question CourseQuestion, answers map[string]string) ([]LessonFieldResult, int, bool) {
	results := make([]LessonFieldResult, 0)
	score := 0
	if len(question.Options) > 0 {
		if len(answers) != 1 {
			return nil, 0, false
		}
		selected, err := strconv.Atoi(answers["choice"])
		if err != nil || selected < 0 || selected >= len(question.Options) {
			return nil, 0, false
		}
		correct := selected == question.Answer
		if correct {
			score = 1
		}
		return []LessonFieldResult{{ID: "choice", Correct: correct, Expected: question.Options[question.Answer]}}, score, true
	}
	if len(answers) != len(question.Fields) {
		return nil, 0, false
	}
	for _, field := range question.Fields {
		value, ok := ParseCourseNumber(answers[field.ID])
		if !ok {
			return nil, 0, false
		}
		correct := math.Abs(value-field.Expected) <= 1e-6*math.Max(1, math.Abs(field.Expected))
		if correct {
			score++
		}
		results = append(results, LessonFieldResult{ID: field.ID, Correct: correct, Expected: strconv.FormatFloat(field.Expected, 'g', -1, 64)})
	}
	return results, score, true
}
