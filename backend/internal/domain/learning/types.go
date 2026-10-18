package learning

import "time"

// Question identifies a versioned self-practice question. Keep IDs immutable
// when changing the meaning or correct option of an existing question.
type Question struct {
	ID     string
	Answer int
	Topic  string
	Lesson string
}

func Questions() []Question {
	return []Question{
		{"energy-signal", 0, "signal-classification", "/learn/experiments/signal-basics"},
		{"convolution-shift", 2, "convolution", "/learn/convolution"},
		{"step-response", 1, "time-constant", "/learn/first-order"},
		{"aliasing", 3, "sampling", "/learn/sampling"},
		{"nyquist", 0, "sampling", "/learn/sampling"},
		{"square-wave", 1, "fourier-series", "/learn/fourier-series"},
		{"pulse-spectrum", 2, "fourier-transform", "/learn/fourier-transform"},
		{"time-constant", 0, "time-constant", "/learn/first-order"},
		{"damping", 1, "second-order", "/learn/second-order"},
		{"right-half-plane", 3, "poles", "/learn/laplace"},
		{"am-bandwidth", 2, "modulation", "/learn/modulation"},
		{"imaginary-axis", 0, "poles", "/learn/laplace"},
	}
}

type Attempt struct {
	ID         string
	UserID     uint
	QuestionID string
	Selected   int
	Correct    bool
	CreatedAt  time.Time
}

type QuestionProgress struct {
	QuestionID   string
	Attempts     int64
	CorrectCount int64
	Latest       Attempt
}

type Progress struct {
	Questions []QuestionProgress
	Recent    []Attempt
}
