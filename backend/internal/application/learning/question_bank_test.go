package learning

import (
	"fmt"
	"strconv"
	"strings"
	"testing"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
)

func TestQuestionBankCoverageAndAnswers(t *testing.T) {
	wantCounts := map[string]int{"quick": 240, "review": 480, "preview": 52, "in_class": 52, "after_class": 52, "preview_retest": 52, "in_class_retest": 52, "homework": 40, "lab_concept": 48, "lab_calculation": 768, "lab_checkpoint": 24}
	for _, locale := range []string{"zh-CN", "en-US"} {
		counts, ids := map[string]int{}, map[string]bool{}
		for _, q := range staffQuestionBanks[locale] {
			if ids[q.ID] || q.ID == "" || q.Prompt == "" || len(q.Parts) == 0 {
				t.Fatalf("invalid or duplicate question: %s / %s", locale, q.ID)
			}
			ids[q.ID] = true
			counts[q.Category]++
			for _, part := range q.Parts {
				if len(part.Answers) == 0 || strings.TrimSpace(strings.Join(part.Answers, "")) == "" || (part.Explanation == "" && q.Explanation == "") {
					t.Fatalf("missing answer/explanation: %s / %s", locale, q.ID)
				}
				if len(part.Options) > 0 {
					for _, answer := range part.Answers {
						if len(answer) != 1 || int(answer[0]-'A') >= len(part.Options) {
							t.Fatalf("choice answer is not a displayed option: %s / %q", q.ID, answer)
						}
					}
				}
			}
		}
		for category, count := range wantCounts {
			if counts[category] != count {
				t.Fatalf("%s / %s: got %d, want %d", locale, category, counts[category], count)
			}
		}
	}
}

func TestQuestionBankLabAnswersPassExistingGrader(t *testing.T) {
	for _, course := range []string{"L1", "L2", "L3"} {
		for _, task := range labassessment.TaskIDs(course) {
			for variant := 0; variant < 64; variant++ {
				paper, err := labassessment.PaperFor(task, variant)
				if err != nil {
					t.Fatal(err)
				}
				question := labBankQuestion(paper, "lab_calculation", fmt.Sprintf("%s-%d", task, variant))
				answers := map[string]string{}
				partIndex := 0
				for _, field := range paper.Fields {
					if field.ID == "C1" || field.ID == "C2" {
						continue
					}
					part := question.Parts[partIndex]
					partIndex++
					raw := part.Answers[0]
					if field.Kind == "choice" {
						raw = field.Options[int(raw[0]-'A')].ID
					} else if field.Kind == "alpha" || field.Kind == "ratio" {
						if !strings.Contains(raw, "参考方案") || !strings.Contains(part.Explanation, "其他参数方案") {
							t.Fatalf("unlabelled reference answer: %s", question.ID)
						}
						raw = strings.SplitN(raw, "：", 2)[1]
					}
					answers[field.ID] = raw
				}
				grade, err := labassessment.Grade(paper, answers)
				if err != nil {
					t.Fatalf("%s: %v", question.ID, err)
				}
				for _, field := range grade.Fields {
					if field.ID != "C1" && field.ID != "C2" && !field.Correct {
						t.Fatalf("displayed answer rejected: %s / %s / %q", question.ID, field.ID, answers[field.ID])
					}
				}
			}
		}
	}
}

func TestQuestionBankSearchAndPagination(t *testing.T) {
	service := &Service{}
	first, err := service.QuestionBank("teacher", "zh-CN", "", "", 1, 20)
	if err != nil || first.Total != 1860 || len(first.Questions) != 20 || len(first.Categories) != 11 {
		t.Fatalf("first page: %+v, %v", first, err)
	}
	second, _ := service.QuestionBank("teacher", "zh-CN", "", "", 2, 20)
	if second.Questions[0].ID == first.Questions[0].ID {
		t.Fatal("pagination repeated first page")
	}
	empty, _ := service.QuestionBank("teacher", "zh-CN", "", "", 94, 20)
	if len(empty.Questions) != 0 || empty.Total != 1860 {
		t.Fatalf("page past end: %+v", empty)
	}
	for _, tc := range []struct {
		category, query string
		total           int
	}{
		{"review", "", 480}, {"quick", "ENERGY-SIGNAL", 1},
		{"lab_calculation", "L2-3 参考方案", 64}, {"homework", "hw2-q1 支撑", 1},
		{"quick", "no-such-question-keyword", 0},
	} {
		result, err := service.QuestionBank("teacher", "zh-CN", tc.category, tc.query, 1, 20)
		if err != nil || result.Total != tc.total {
			t.Fatalf("%s %q: %+v, %v", tc.category, tc.query, result, err)
		}
	}
	for _, size := range []int{0, 101} {
		if _, err := service.QuestionBank("teacher", "zh-CN", "", "", 1, size); err == nil {
			t.Fatal("accepted page size " + strconv.Itoa(size))
		}
	}
	if _, err := service.QuestionBank("teacher", "zh-CN", "unknown", "", 1, 20); err == nil {
		t.Fatal("accepted unknown category")
	}
	if _, err := service.QuestionBank("student", "zh-CN", "", "", 1, 20); err != ErrQuestionBankForbidden {
		t.Fatal("student obtained bank")
	}
}
