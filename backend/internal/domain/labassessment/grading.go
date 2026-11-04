package labassessment

import (
	"math"
	"strconv"
	"strings"
)

func Grade(p Paper, answers map[string]string) (Result, error) {
	result := Result{Fields: []FieldResult{}}
	allowed := map[string]bool{}
	for _, f := range p.Fields {
		allowed[f.ID] = true
	}
	for key := range answers {
		if !allowed[key] {
			return result, ErrInvalid
		}
	}
	for _, f := range p.Fields {
		raw := strings.TrimSpace(answers[f.ID])
		correct := false
		expected := f.Answer
		if f.Kind != "choice" {
			expected = strconv.FormatFloat(f.Expected, 'g', 8, 64)
		}
		if raw != "" {
			if f.Kind == "choice" {
				valid := false
				for _, o := range f.Options {
					if raw == o.ID {
						valid = true
					}
				}
				if !valid {
					return result, ErrInvalid
				}
				correct = raw == f.Answer
			} else {
				value, ok := parseNumber(raw, f.Unit)
				if !ok {
					return result, ErrInvalid
				}
				tolerance := f.Tolerance
				if tolerance == 0 {
					tolerance = math.Max(.001, .005*math.Abs(f.Expected))
				}
				switch f.Kind {
				case "integer":
					correct = value == f.Expected
				case "phase":
					phaseTolerance := f.Tolerance
					if phaseTolerance == 0 {
						phaseTolerance = .01
					}
					correct = math.Abs(math.Remainder(value-f.Expected, 2*math.Pi)) <= phaseTolerance
				case "alpha":
					center, validCenter := parseNumber(answers["center"], "Hz")
					correct = validCenter && center >= 40 && center <= 60 && value > 0 && value <= 80 && Notch(center, value, p.Parameters["keep"]) >= .95 && Notch(center, value, p.Parameters["noise"]) <= .05
					expected = "满足双幅度指标的正 α"
				case "ratio":
					center, ok1 := parseNumber(answers["center"], "Hz")
					alpha, ok2 := parseNumber(answers["alpha"], "s⁻¹")
					freq := p.Parameters["keep"]
					if f.ID == "noiseRatio" {
						freq = p.Parameters["noise"]
					}
					if ok1 && ok2 && center >= 40 && center <= 60 && alpha >= -20 && alpha <= 80 {
						target := Notch(center, alpha, freq)
						correct = math.Abs(value-target) <= math.Max(.001, .005*math.Abs(target))
						expected = strconv.FormatFloat(target, 'g', 8, 64)
					} else {
						expected = "先填写有效的中心频率与 α"
					}
				default:
					correct = math.Abs(value-f.Expected) <= tolerance
				}
			}
		}
		item := FieldResult{ID: f.ID, Submitted: raw, Expected: expected, Explanation: f.Explanation, Correct: correct, Maximum: f.Points}
		if correct {
			item.Points = f.Points
			result.Score += f.Points
			if f.ID == "C1" || f.ID == "C2" {
				result.Concepts += f.Points
			} else {
				result.Independent += f.Points
			}
		}
		result.Fields = append(result.Fields, item)
	}
	return result, nil
}
