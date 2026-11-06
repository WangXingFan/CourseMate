package learning

import (
	"fmt"
	"strconv"
)

// BankQuestion is the staff-only reading model, including grading information.
type BankQuestion struct {
	ID, Category, Title, Prompt, Formula, Explanation, Language, LessonURL string
	Parts                                                                  []BankPart
}

type BankPart struct {
	Label, Explanation string
	Options, Answers   []string
}

func ChoiceBankPart(options []string, answer int) BankPart {
	return BankPart{Options: options, Answers: []string{string(rune('A' + answer))}}
}

// LearningBankQuestions reads the same embedded questions used by grading.
func LearningBankQuestions(locale string) []BankQuestion {
	result := make([]BankQuestion, 0, 980)
	english := locale == "en-US"
	for _, q := range questionBank.Questions {
		text := q.ZH
		if english {
			text = q.EN
		}
		title := fmt.Sprintf("第%s章", q.ChapterID)
		if english {
			title = "Chapter " + q.ChapterID
		}
		link := q.Lesson
		if len(q.Sources) > 0 {
			link = "/learn/knowledge?lesson=" + q.Sources[0]
		}
		result = append(result, BankQuestion{ID: q.ID, Category: "quick", Title: title, Prompt: text.Prompt, Explanation: text.Explanation, Language: locale, LessonURL: link, Parts: []BankPart{ChoiceBankPart(text.Options, q.Answer)}})
		for _, variant := range q.Variants {
			text := variant.ZH
			if english {
				text = variant.EN
			}
			result = append(result, BankQuestion{ID: variant.ID, Category: "review", Title: title, Prompt: text.Prompt, Explanation: text.Explanation, Language: locale, LessonURL: link, Parts: []BankPart{ChoiceBankPart(text.Options, variant.Answer)}})
		}
	}
	for _, lesson := range PracticeCourseLessons() {
		appendQuestion := func(q CourseQuestion, category string) {
			parts := []BankPart{}
			if len(q.Options) > 0 {
				parts = append(parts, ChoiceBankPart(q.Options, q.Answer))
			} else {
				for _, field := range q.Fields {
					value := strconv.FormatFloat(field.Expected, 'g', -1, 64)
					if field.Unit != "" {
						value += " " + field.Unit
					}
					parts = append(parts, BankPart{Label: field.Label, Answers: []string{value}})
				}
			}
			result = append(result, BankQuestion{ID: q.ID, Category: category, Title: lesson.Number + " " + lesson.Title, Prompt: q.Prompt, Formula: q.Formula, Explanation: q.Explanation, Language: "zh-CN", LessonURL: "/learn/knowledge?lesson=" + lesson.ID, Parts: parts})
		}
		for _, q := range lesson.Questions {
			appendQuestion(q, q.Stage)
		}
		if pair := FindCourseQuestionPair(lesson.ID); pair != nil {
			appendQuestion(pair.Followup, "preview_retest")
		}
		if followup := FindInClassFollowup(lesson.ID); followup != nil {
			appendQuestion(*followup, "in_class_retest")
		}
	}
	return result
}
