package learning

import (
	"math"
	"strconv"
	"testing"
)

func TestCourseNumberGrammar(t *testing.T) {
	for input, want := range map[string]float64{"9/4": 2.25, "−2/4": -0.5, " 1 / 2 ": 0.5, ".5": 0.5, "1e-3": 0.001} {
		got, valid := ParseCourseNumber(input)
		if !valid || math.Abs(got-want) > 1e-12 {
			t.Errorf("%q: %g %v", input, got, valid)
		}
	}
	for _, input := range []string{"", "NaN", "Inf", "1/0", "1/2/3", "t+1", "1e999", "0x1p0", "<script>", "1+1", "1_000", "1e13"} {
		if _, valid := ParseCourseNumber(input); valid {
			t.Errorf("accepted %q", input)
		}
	}
}

func TestCourseCoverageAndAnswerRules(t *testing.T) {
	if len(course.Lessons) != 52 {
		t.Fatalf("lessons=%d", len(course.Lessons))
	}
	seen := map[string]bool{}
	numeric := 0
	for _, lesson := range course.Lessons {
		if len(lesson.Questions) != 3 || lesson.Markdown == "" {
			t.Fatalf("incomplete %s", lesson.ID)
		}
		for i, q := range lesson.Questions {
			if q.Stage != []string{"preview", "in_class", "after_class"}[i] || seen[q.ID] || q.Explanation == "" {
				t.Fatalf("invalid %s", q.ID)
			}
			seen[q.ID] = true
			answers := map[string]string{}
			if len(q.Options) > 0 {
				answers["choice"] = strconv.Itoa(q.Answer)
			} else {
				numeric++
				for _, field := range q.Fields {
					answers[field.ID] = strconv.FormatFloat(field.Expected, 'g', -1, 64)
				}
			}
			results, score, valid := GradeCourseQuestion(q, answers)
			if !valid || score != len(results) || score == 0 {
				t.Fatalf("invalid key for %s", q.ID)
			}
		}
	}
	if len(seen) != 156 || numeric < 30 {
		t.Fatalf("questions=%d numeric=%d", len(seen), numeric)
	}
}

func TestPracticeCourseLessonsExcludeOutOfScopeChapters(t *testing.T) {
	lessons := PracticeCourseLessons()
	if len(lessons) != 52 {
		t.Fatalf("practice lessons=%d, want 52", len(lessons))
	}
	for _, id := range []string{"ss-0-1", "ss-4-1", "ss-6-1", "ss-7-1"} {
		if FindPracticeCourseLesson(id) != nil {
			t.Fatalf("excluded lesson exposed: %s", id)
		}
	}
	if lesson := FindCourseLesson("ss-5-1"); lesson == nil || lesson.Number != "4.1" || lesson.Chapter != "第4章 连续系统s域分析" {
		t.Fatalf("renumbered chapter missing: %#v", lesson)
	}
}

func TestCoursePartialCreditAndMissingFields(t *testing.T) {
	q := FindCourseLesson("ss-2-5").Questions[1]
	answers := map[string]string{"f1": "1", "f2": "1", "f3": "3", "f4": "1"}
	results, score, valid := GradeCourseQuestion(q, answers)
	if !valid || score != 3 || len(results) != 4 || results[3].Correct {
		t.Fatalf("partial: %d %+v %v", score, results, valid)
	}
	delete(answers, "f4")
	if _, _, valid := GradeCourseQuestion(q, answers); valid {
		t.Fatal("missing field was graded")
	}
	answers["f4"] = "not a number"
	if _, _, valid := GradeCourseQuestion(q, answers); valid {
		t.Fatal("unparseable input was graded")
	}
	answers["f4"] = "-1.0000001"
	if _, score, valid := GradeCourseQuestion(q, answers); !valid || score != 4 {
		t.Fatal("tolerance failed")
	}
}
