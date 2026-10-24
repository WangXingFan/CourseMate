package learning

// Variant is a server-owned follow-up question for one of the quick-practice
// concepts. The client sends only the identifier; correctness never comes from
// the browser.
type Variant struct {
	ID             string
	BaseQuestionID string
	Answer         int
	ZH             VariantText
	EN             VariantText
}

type VariantText struct {
	Prompt      string
	Options     []string
	Explanation string
}

func FindQuestion(id string) *Question {
	for _, question := range Questions() {
		if question.ID == id {
			copy := question
			return &copy
		}
	}
	return nil
}

func FindVariant(id string) *Variant {
	for _, variant := range Variants() {
		if variant.ID == id {
			copy := variant
			return &copy
		}
	}
	return nil
}

func SuggestedVariant(questionID string, reviewStage int) string {
	suffix := "v1"
	if reviewStage%2 == 1 {
		suffix = "v2"
	}
	variantID := questionID + "-" + suffix
	if FindVariant(variantID) == nil {
		return ""
	}
	return variantID
}
