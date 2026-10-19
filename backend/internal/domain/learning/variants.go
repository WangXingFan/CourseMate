package learning

// Variant is a server-owned follow-up question for one of the quick-practice
// concepts. The client sends only the identifier; correctness never comes from
// the browser.
type Variant struct {
	ID             string
	BaseQuestionID string
	Answer         int
}

// Variants returns two deterministic follow-up variants per catalog question.
// Keeping variant IDs stable lets review requests remain idempotent.
func Variants() []Variant {
	return []Variant{
		{ID: "energy-signal-v1", BaseQuestionID: "energy-signal", Answer: 0},
		{ID: "energy-signal-v2", BaseQuestionID: "energy-signal", Answer: 1},
		{ID: "convolution-shift-v1", BaseQuestionID: "convolution-shift", Answer: 0},
		{ID: "convolution-shift-v2", BaseQuestionID: "convolution-shift", Answer: 2},
		{ID: "step-response-v1", BaseQuestionID: "step-response", Answer: 2},
		{ID: "step-response-v2", BaseQuestionID: "step-response", Answer: 3},
		{ID: "aliasing-v1", BaseQuestionID: "aliasing", Answer: 3},
		{ID: "aliasing-v2", BaseQuestionID: "aliasing", Answer: 3},
		{ID: "nyquist-v1", BaseQuestionID: "nyquist", Answer: 1},
		{ID: "nyquist-v2", BaseQuestionID: "nyquist", Answer: 2},
		{ID: "square-wave-v1", BaseQuestionID: "square-wave", Answer: 0},
		{ID: "square-wave-v2", BaseQuestionID: "square-wave", Answer: 1},
		{ID: "pulse-spectrum-v1", BaseQuestionID: "pulse-spectrum", Answer: 2},
		{ID: "pulse-spectrum-v2", BaseQuestionID: "pulse-spectrum", Answer: 3},
		{ID: "time-constant-v1", BaseQuestionID: "time-constant", Answer: 0},
		{ID: "time-constant-v2", BaseQuestionID: "time-constant", Answer: 1},
		{ID: "damping-v1", BaseQuestionID: "damping", Answer: 0},
		{ID: "damping-v2", BaseQuestionID: "damping", Answer: 3},
		{ID: "right-half-plane-v1", BaseQuestionID: "right-half-plane", Answer: 3},
		{ID: "right-half-plane-v2", BaseQuestionID: "right-half-plane", Answer: 0},
		{ID: "am-bandwidth-v1", BaseQuestionID: "am-bandwidth", Answer: 2},
		{ID: "am-bandwidth-v2", BaseQuestionID: "am-bandwidth", Answer: 3},
		{ID: "imaginary-axis-v1", BaseQuestionID: "imaginary-axis", Answer: 0},
		{ID: "imaginary-axis-v2", BaseQuestionID: "imaginary-axis", Answer: 1},
	}
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
