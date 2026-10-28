package learning

import (
	"bytes"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image/png"
	"math"
	"strconv"
	"strings"
	"time"
)

const MaxVirtualLabDocument = 20 * 1024 * 1024

var ErrVirtualLabConflict = errors.New("virtual lab record changed in another session")

//go:embed content/virtual-lab-task-specs.json
var virtualLabTaskSpecsJSON []byte

type labParameterSpec struct {
	Type    string
	Min     float64
	Max     float64
	Options []string
}
type labTaskSpec struct {
	Params  map[string]labParameterSpec
	Answers []string
}

var virtualLabTaskSpecs = func() map[string]labTaskSpec {
	var specs map[string]labTaskSpec
	if err := json.Unmarshal(virtualLabTaskSpecsJSON, &specs); err != nil {
		panic(err)
	}
	return specs
}()

// VirtualLab stores student evidence, not a server-assigned grade.
type VirtualLab struct {
	UserID    uint
	Revision  uint64
	Document  string
	UpdatedAt *time.Time
}

// ValidateVirtualLab bounds untrusted snapshots. The experiment engine additionally
// validates each model's parameters and measurements before restoring a document.
func ValidateVirtualLab(document string) error {
	if len(document) == 0 || len(document) > MaxVirtualLabDocument {
		return errors.New("invalid document size")
	}
	var raw map[string]any
	if err := json.Unmarshal([]byte(document), &raw); err != nil {
		return err
	}
	if !boundedLabValue(raw, 0) || raw["schemaVersion"] != float64(2) || raw["appVersion"] != "1.0.0" {
		return errors.New("unsupported lab document")
	}
	for _, key := range []string{"createdAt", "updatedAt"} {
		value, ok := raw[key].(string)
		if !ok {
			return errors.New("missing timestamp")
		}
		if _, err := time.Parse(time.RFC3339Nano, value); err != nil {
			return err
		}
	}
	student, ok := raw["student"].(map[string]any)
	if !ok {
		return errors.New("missing student")
	}
	for _, key := range []string{"name", "number", "classroom"} {
		value, ok := student[key].(string)
		if !ok || len([]rune(value)) > 100 {
			return errors.New("invalid student field")
		}
	}
	tasks, ok := raw["tasks"].(map[string]any)
	if !ok || len(tasks) != 12 {
		return errors.New("expected twelve tasks")
	}
	for course := 1; course <= 3; course++ {
		for task := 1; task <= 4; task++ {
			id := fmt.Sprintf("L%d-%d", course, task)
			item, ok := tasks[id].(map[string]any)
			if !ok || item["taskId"] != id || item["experimentId"] != id[:2] {
				return errors.New("invalid task")
			}
			for _, key := range []string{"params", "answers", "completion"} {
				if _, ok := item[key].(map[string]any); !ok {
					return errors.New("missing task object")
				}
			}
			if !validLabInputs(id, item) {
				return errors.New("invalid experiment parameters or answers")
			}
			if python, exists := item["python"]; exists && !validLabPython(id, python) {
				return errors.New("invalid Python evidence")
			}
			for _, key := range []string{"prediction", "predictionDraft", "derivation", "analysis"} {
				if _, ok := item[key].(string); !ok {
					return errors.New("missing task text")
				}
			}
			for key, limit := range map[string]int{"trials": 200, "figures": 200, "revisions": 100} {
				value, ok := item[key].([]any)
				if !ok || len(value) > limit {
					return errors.New("invalid task evidence")
				}
			}
			for _, key := range []string{"trials", "figures"} {
				for _, value := range item[key].([]any) {
					evidence, ok := value.(map[string]any)
					if !ok || !validLabInputs(id, evidence) || !validLabDate(evidence["time"]) {
						return errors.New("invalid saved experiment")
					}
					if key == "trials" {
						if _, ok := evidence["measurements"].(map[string]any); !ok {
							return errors.New("invalid measurement")
						}
						units, ok := evidence["units"].(map[string]any)
						if !ok || units["time"] != "s" || units["amplitude"] != "归一化" || units["area"] != "幅度·s" {
							return errors.New("invalid units")
						}
						windows, ok := evidence["window"].([]any)
						if !ok || len(windows) < 1 || len(windows) > 4 {
							return errors.New("invalid plot window")
						}
						for _, value := range windows {
							window, ok := value.(map[string]any)
							if !ok {
								return errors.New("invalid plot window")
							}
							pair, ok := window["range"].([]any)
							if !ok || len(pair) != 2 {
								return errors.New("invalid plot range")
							}
							lo, ok1 := pair[0].(float64)
							hi, ok2 := pair[1].(float64)
							if !ok1 || !ok2 || lo >= hi {
								return errors.New("invalid plot range")
							}
						}
					}
				}
			}
			for _, value := range item["revisions"].([]any) {
				revision, ok := value.(map[string]any)
				if !ok || !validLabDate(revision["time"]) {
					return errors.New("invalid prediction revision")
				}
				if _, ok := revision["text"].(string); !ok {
					return errors.New("invalid prediction text")
				}
			}
			completion := item["completion"].(map[string]any)
			confirmed, ok := completion["confirmed"].(bool)
			if !ok {
				return errors.New("invalid completion")
			}
			if completion["confirmedAt"] != nil && !validLabDate(completion["confirmedAt"]) {
				return errors.New("invalid completion date")
			}
			if confirmed && (item["prediction"] == "" || item["analysis"] == "" || len(item["trials"].([]any)) == 0) {
				return errors.New("missing completion evidence")
			}
		}
	}
	return nil
}

func validLabPython(id string, value any) bool {
	python, ok := value.(map[string]any)
	if !ok || !validLabText(python["code"]) {
		return false
	}
	if python["result"] == nil {
		_, exists := python["result"]
		return exists
	}
	run, ok := python["result"].(map[string]any)
	if !ok || !validLabText(run["code"]) || !validLabText(run["stdout"]) || !validLabText(run["stderr"]) || !validLabDate(run["time"]) {
		return false
	}
	answers := map[string]any{}
	for _, key := range virtualLabTaskSpecs[id].Answers {
		answers[key] = ""
	}
	if !validLabInputs(id, map[string]any{"params": run["params"], "answers": answers}) {
		return false
	}
	plots, ok := run["plots"].([]any)
	if !ok || len(plots) > 4 {
		return false
	}
	for _, plot := range plots {
		chunks, ok := plot.([]any)
		if !ok || len(chunks) == 0 || len(chunks) > 22 {
			return false
		}
		var encoded strings.Builder
		for _, chunk := range chunks {
			text, ok := chunk.(string)
			if !ok || len(text) == 0 || len(text) > 12000 {
				return false
			}
			encoded.WriteString(text)
		}
		if encoded.Len() > 262144 {
			return false
		}
		data, err := base64.StdEncoding.Strict().DecodeString(encoded.String())
		if err != nil {
			return false
		}
		config, err := png.DecodeConfig(bytes.NewReader(data))
		if err != nil || config.Width > 8192 || config.Height > 8192 {
			return false
		}
	}
	return true
}

func validLabText(value any) bool {
	text, ok := value.(string)
	return ok && len([]rune(text)) <= 12000
}

func validLabDate(value any) bool {
	text, ok := value.(string)
	if !ok {
		return false
	}
	_, err := time.Parse(time.RFC3339Nano, text)
	return err == nil
}

func validLabInputs(id string, item map[string]any) bool {
	spec, ok := virtualLabTaskSpecs[id]
	if !ok {
		return false
	}
	params, ok := item["params"].(map[string]any)
	if !ok || len(params) != len(spec.Params) {
		return false
	}
	for key, p := range spec.Params {
		value := params[key]
		if p.Type == "select" {
			text, ok := value.(string)
			if !ok {
				return false
			}
			found := false
			for _, choice := range p.Options {
				if text == choice {
					found = true
					break
				}
			}
			if !found {
				return false
			}
		} else {
			number, ok := value.(float64)
			if !ok || number < p.Min || number > p.Max || (id == "L1-1" && key == "a" && math.Abs(number) < 0.25) {
				return false
			}
		}
	}
	answers, ok := item["answers"].(map[string]any)
	if !ok || len(answers) != len(spec.Answers) {
		return false
	}
	for _, key := range spec.Answers {
		value, ok := answers[key].(string)
		if !ok || len(value) > 100 {
			return false
		}
		value = strings.TrimSpace(value)
		if value != "" {
			number, err := strconv.ParseFloat(value, 64)
			if err != nil || math.IsNaN(number) || math.IsInf(number, 0) || math.Abs(number) > 100 {
				return false
			}
		}
	}
	return true
}

func boundedLabValue(value any, depth int) bool {
	if depth > 16 {
		return false
	}
	switch v := value.(type) {
	case nil, bool:
		return true
	case float64:
		return math.Abs(v) <= 1e9
	case string:
		return len([]rune(v)) <= 12000
	case []any:
		if len(v) > 500 {
			return false
		}
		for _, x := range v {
			if !boundedLabValue(x, depth+1) {
				return false
			}
		}
	case map[string]any:
		if len(v) > 100 {
			return false
		}
		for key, x := range v {
			if len(key) > 100 || key == "__proto__" || key == "prototype" || key == "constructor" || !boundedLabValue(x, depth+1) {
				return false
			}
		}
	default:
		return false
	}
	return true
}
