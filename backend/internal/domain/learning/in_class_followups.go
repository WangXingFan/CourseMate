package learning

import (
	_ "embed"
	"encoding/json"
)

//go:embed content/in-class-followups.json
var inClassFollowupsJSON []byte

var inClassFollowups = func() map[string]CourseQuestion {
	var questions map[string]CourseQuestion
	if err := json.Unmarshal(inClassFollowupsJSON, &questions); err != nil {
		panic(err)
	}
	return questions
}()

func FindInClassFollowup(lessonID string) *CourseQuestion {
	question, ok := inClassFollowups[lessonID]
	if !ok {
		return nil
	}
	return &question
}
