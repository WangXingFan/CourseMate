package learning

import "time"

// Question identifies a versioned self-practice question. Keep IDs immutable
// when changing the meaning or correct option of an existing question.
type Question struct {
	ID             string
	Answer         int
	Topic          string
	Lesson         string
	Misconceptions map[int]string
}

// Questions is the stable twelve-question quick-practice catalog. Variants
// intentionally live outside this catalog so the existing quiz flow keeps its
// ordering and answer contract.
func Questions() []Question {
	return []Question{
		{ID: "energy-signal", Answer: 0, Topic: "signal-classification", Lesson: "/learn/experiments/signal-basics", Misconceptions: map[int]string{1: "energy-signal-power", 2: "energy-signal-neither", 3: "energy-signal-both"}},
		{ID: "convolution-shift", Answer: 2, Topic: "convolution", Lesson: "/learn/convolution", Misconceptions: map[int]string{0: "convolution-shift-direction", 1: "convolution-shift-scale", 3: "convolution-shift-ignore"}},
		{ID: "step-response", Answer: 1, Topic: "time-constant", Lesson: "/learn/first-order", Misconceptions: map[int]string{0: "step-response-half", 2: "step-response-two-tau", 3: "step-response-settling"}},
		{ID: "aliasing", Answer: 3, Topic: "sampling", Lesson: "/learn/sampling", Misconceptions: map[int]string{0: "aliasing-no-fold", 1: "aliasing-sample-rate", 2: "aliasing-add-frequencies"}},
		{ID: "nyquist", Answer: 0, Topic: "sampling", Lesson: "/learn/sampling", Misconceptions: map[int]string{1: "nyquist-equal", 2: "nyquist-half", 3: "nyquist-double-again"}},
		{ID: "square-wave", Answer: 1, Topic: "fourier-series", Lesson: "/learn/fourier-series", Misconceptions: map[int]string{0: "square-wave-even", 2: "square-wave-period", 3: "square-wave-energy"}},
		{ID: "pulse-spectrum", Answer: 2, Topic: "fourier-transform", Lesson: "/learn/fourier-transform", Misconceptions: map[int]string{0: "pulse-spectrum-same-width", 1: "pulse-spectrum-direct", 3: "pulse-spectrum-nonmonotonic"}},
		{ID: "time-constant", Answer: 0, Topic: "time-constant", Lesson: "/learn/first-order", Misconceptions: map[int]string{1: "time-constant-inverse", 2: "time-constant-independent", 3: "time-constant-peaking"}},
		{ID: "damping", Answer: 1, Topic: "second-order", Lesson: "/learn/second-order", Misconceptions: map[int]string{0: "damping-more-overshoot", 2: "damping-no-effect", 3: "damping-infinite"}},
		{ID: "right-half-plane", Answer: 3, Topic: "poles", Lesson: "/learn/laplace", Misconceptions: map[int]string{0: "rhp-stable", 1: "rhp-marginal", 2: "rhp-undecidable"}},
		{ID: "am-bandwidth", Answer: 2, Topic: "modulation", Lesson: "/learn/modulation", Misconceptions: map[int]string{0: "am-single-sideband", 1: "am-double-sideband-twice", 3: "am-half"}},
		{ID: "imaginary-axis", Answer: 0, Topic: "poles", Lesson: "/learn/laplace", Misconceptions: map[int]string{1: "imaginary-axis-decay", 2: "imaginary-axis-real", 3: "imaginary-axis-grow"}},
	}
}

type Attempt struct {
	ID           string
	UserID       uint
	QuestionID   string
	Selected     int
	Correct      bool
	Mode         string
	VariantID    string
	ReviewStage  int
	NextReviewAt *time.Time
	CreatedAt    time.Time
}

type QuestionProgress struct {
	QuestionID         string
	Attempts           int64
	CorrectCount       int64
	Latest             Attempt
	LatestWrong        *Attempt
	ReviewStage        int
	NextReviewAt       *time.Time
	SuggestedVariantID string
}

type Progress struct {
	Questions []QuestionProgress
	Recent    []Attempt
}

const (
	AttemptModeQuiz   = "quiz"
	AttemptModeReview = "review"
)
