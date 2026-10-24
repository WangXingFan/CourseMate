package learning

import (
	_ "embed"
	"encoding/json"
)

//go:embed content/paired-questions.json
var pairedQuestionsJSON []byte

// LessonQuestionPair assesses the preview concept again with a new instance.
// It supplements, rather than replaces, the existing 156 stage questions.
type LessonQuestionPair struct {
	LessonID          string
	ConceptID         string
	ConceptTitle      string
	PreviewQuestionID string
	Followup          CourseQuestion
}

var pairedQuestions = func() []LessonQuestionPair {
	var value struct {
		Pairs []LessonQuestionPair
	}
	if err := json.Unmarshal(pairedQuestionsJSON, &value); err != nil {
		panic(err)
	}
	return value.Pairs
}()

func FindCourseQuestionPair(lessonID string) *LessonQuestionPair {
	for i := range pairedQuestions {
		if pairedQuestions[i].LessonID == lessonID {
			return &pairedQuestions[i]
		}
	}
	return nil
}

func FindPreviewQuestionPair(questionID string) *LessonQuestionPair {
	for i := range pairedQuestions {
		if pairedQuestions[i].PreviewQuestionID == questionID {
			return &pairedQuestions[i]
		}
	}
	return nil
}
