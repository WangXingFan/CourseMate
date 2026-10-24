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
	ID         string
	Version    string
	Title      string
	Language   string
	SourceName string
	SourceHash string
	Lessons    []CourseLesson
}

type CourseLesson struct {
	ID        string
	Number    string
	Title     string
	Chapter   string
	Markdown  string
	Questions []CourseQuestion
}

// CourseQuestion contains private grading data. HTTP must project public fields.
type CourseQuestion struct {
	ID          string
	Stage       string
	Prompt      string
	Options     []string
	Answer      int
	Formula     string
	Fields      []CourseField
	Explanation string
}

type CourseField struct {
	ID       string
	Label    string
	Unit     string
	Expected float64
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

// PracticeCourseLessons returns the lessons exposed by the published course
// catalog. The generator removes out-of-scope chapters before embedding it.
func PracticeCourseLessons() []CourseLesson {
	return course.Lessons
}

// FindPracticeCourseLesson returns a lesson from the published course catalog.
func FindPracticeCourseLesson(id string) *CourseLesson {
	return FindCourseLesson(id)
}

func FindCourseLesson(id string) *CourseLesson {
	for i := range course.Lessons {
		if course.Lessons[i].ID == id {
			return &course.Lessons[i]
		}
	}
	return nil
}

type LessonFieldResult struct {
	ID       string
	Correct  bool
	Expected string
}

type LessonAttempt struct {
	ID          string
	UserID      uint
	Version     string
	LessonID    string
	QuestionID  string
	Stage       string
	Answers     map[string]string
	Score       int
	Total       int
	Results     []LessonFieldResult
	Explanation string
	CreatedAt   time.Time
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
