package learning

import (
	_ "embed"
	"encoding/json"
)

//go:embed content/quick-questions.json
var questionBankJSON []byte

type bankQuestion struct {
	Question
	ZH       VariantText
	EN       VariantText
	Variants []Variant
}

var questionBank = func() struct {
	Version   string
	Questions []bankQuestion
} {
	var bank struct {
		Version   string
		Questions []bankQuestion
	}
	if err := json.Unmarshal(questionBankJSON, &bank); err != nil {
		panic(err)
	}
	return bank
}()

// QuizBankVersion separates rankings with different question counts or rules.
func QuizBankVersion() string { return questionBank.Version }

// Questions projects the single authored bank used by grading and web text.
// Existing IDs and answer indices remain stable for saved practice history.
func Questions() []Question {
	questions := make([]Question, 0, len(questionBank.Questions))
	for _, q := range questionBank.Questions {
		questions = append(questions, q.Question)
	}
	return questions
}

func Variants() []Variant {
	variants := make([]Variant, 0, 2*len(questionBank.Questions))
	for _, q := range questionBank.Questions {
		variants = append(variants, q.Variants...)
	}
	return variants
}
