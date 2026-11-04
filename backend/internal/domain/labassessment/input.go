package labassessment

import (
	learning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"strings"
)

// Bare numbers use the printed field unit. Only dimensionally matching suffixes
// are accepted; fractions remain supported without evaluating expressions.
func parseNumber(raw, unit string) (float64, bool) {
	raw = strings.TrimSpace(raw)
	type suffix struct {
		text   string
		factor float64
	}
	choices := []suffix{}
	switch unit {
	case "s":
		choices = []suffix{{"毫秒", .001}, {"ms", .001}, {"秒", 1}, {"s", 1}}
	case "Hz":
		choices = []suffix{{"kHz", 1000}, {"千赫兹", 1000}, {"Hz", 1}, {"赫兹", 1}}
	case "rad":
		choices = []suffix{{"rad", 1}, {"弧度", 1}}
	case "rad/s":
		choices = []suffix{{"rad/s", 1}}
	case "s⁻¹":
		choices = []suffix{{"s⁻¹", 1}, {"s^-1", 1}, {"1/s", 1}}
	}
	for _, s := range choices {
		if strings.HasSuffix(raw, s.text) {
			v, ok := learning.ParseCourseNumber(strings.TrimSpace(strings.TrimSuffix(raw, s.text)))
			return v * s.factor, ok
		}
	}
	return learning.ParseCourseNumber(raw)
}
