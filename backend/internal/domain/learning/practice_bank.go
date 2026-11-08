package learning

import (
	_ "embed"
	"encoding/json"
	"slices"
	"strings"
)

// PracticeBankVersion separates self-study attempts from classroom previews.
const PracticeBankVersion = "topic-practice-v1"

type PracticeQuestion struct {
	CourseQuestion
	CanonicalID string
}

type PracticeBank struct {
	Concept   MasteryConcept
	Questions []PracticeQuestion
}

// Reference and summary lessons reuse public practice for the same skills.
// Classroom quiz questions and retests are never included.
var practiceRelatedLessons = map[string][]string{
	"ss-2-9":  {"ss-2-1", "ss-2-3", "ss-2-5"},
	"ss-a-2":  {"ss-5-1", "ss-5-3"},
	"ss-a-3":  {"ss-3-5", "ss-5-2"},
	"ss-a-4":  {"ss-2-5", "ss-2-6"},
	"ss-a-5":  {"ss-5-6"},
	"ss-b-1":  {"ss-1-1"},
	"ss-b-2":  {"ss-1-2"},
	"ss-b-3":  {"ss-2-1", "ss-2-3"},
	"ss-b-4":  {"ss-2-5", "ss-2-6"},
	"ss-b-5":  {"ss-3-2", "ss-3-4"},
	"ss-b-6":  {"ss-5-1", "ss-5-3"},
	"ss-b-7":  {"ss-5-6"},
	"ss-b-8":  {"ss-a-6"},
	"ss-b-10": {"ss-1-1", "ss-1-2", "ss-3-9", "ss-5-6"},
}

var practiceRelatedTopics = map[string][]string{
	"ss-1-6": {"zero-input", "zero-state"},
	"ss-2-3": {"zero-input", "zero-state"},
	"ss-3-3": {"fourier-series"},
	"ss-5-5": {"poles"},
	"ss-5-7": {"frequency-response"},
	"ss-5-9": {"realization"},
	"ss-a-7": {"system-model"},
}

//go:embed content/practice-supplements.json
var practiceSupplementsJSON []byte

var practiceSupplements = func() []struct {
	ID, Topic, Unit string
	Lessons         []string
	Expected        float64
	ZH, EN          VariantText
} {
	var items []struct {
		ID, Topic, Unit string
		Lessons         []string
		Expected        float64
		ZH, EN          VariantText
	}
	if err := json.Unmarshal(practiceSupplementsJSON, &items); err != nil {
		panic(err)
	}
	return items
}()

func FindPracticeBank(conceptID, locale string) *PracticeBank {
	var bank *PracticeBank
	for _, concept := range masteryCatalog() {
		if concept.ID == conceptID {
			bank = &PracticeBank{Concept: concept, Questions: []PracticeQuestion{}}
			break
		}
	}
	if bank == nil {
		return nil
	}
	lessons := append([]string{bank.Concept.LessonID}, practiceRelatedLessons[bank.Concept.LessonID]...)
	matches := func(topic string, sources []string) bool {
		if bank.Concept.Kind == "practice" {
			return topic == bank.Concept.Topic
		}
		return slices.ContainsFunc(sources, func(id string) bool { return slices.Contains(lessons, id) }) || slices.Contains(practiceRelatedTopics[bank.Concept.LessonID], topic)
	}
	appendChoice := func(id string, answer int, zh, en VariantText) {
		text := zh
		if locale == "en-US" {
			text = en
		}
		bank.Questions = append(bank.Questions, PracticeQuestion{CanonicalID: id, CourseQuestion: CourseQuestion{
			ID: practiceQuestionID(conceptID, id), Stage: "practice", Prompt: text.Prompt, Options: text.Options, Answer: answer, Explanation: text.Explanation,
		}})
	}
	for _, q := range questionBank.Questions {
		if !matches(q.Topic, q.Sources) {
			continue
		}
		appendChoice(q.ID, q.Answer, q.ZH, q.EN)
		for _, v := range q.Variants {
			appendChoice(v.ID, v.Answer, v.ZH, v.EN)
		}
	}
	for _, q := range practiceSupplements {
		if !matches(q.Topic, q.Lessons) {
			continue
		}
		text, label := q.ZH, "答案"
		if locale == "en-US" {
			text, label = q.EN, "Answer"
		}
		bank.Questions = append(bank.Questions, PracticeQuestion{CanonicalID: q.ID, CourseQuestion: CourseQuestion{
			ID: practiceQuestionID(conceptID, q.ID), Stage: "practice", Prompt: text.Prompt, Explanation: text.Explanation,
			Fields: []CourseField{{ID: "value", Label: label, Unit: q.Unit, Expected: q.Expected}},
		}})
	}
	return bank
}

func practiceQuestionID(conceptID, id string) string {
	return "sp:" + strings.TrimPrefix(conceptID, "lesson:") + ":" + id
}
