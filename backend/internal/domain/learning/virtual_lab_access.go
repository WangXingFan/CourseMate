package learning

import (
	"encoding/json"
	"reflect"
	"sort"
	"strings"
)

// Closed courses retain their evidence, including when the browser migrates old
// tasks into the corresponding archive. Record metadata may still be updated.
func VirtualLabChangesAllowed(previous, next string, access map[string]bool) bool {
	before, ok := labCourseEvidence(previous)
	if !ok {
		return false
	}
	after, ok := labCourseEvidence(next)
	if !ok {
		return false
	}
	// v1 -> v1.1 also copied selected old inputs into new tasks. Accept only
	// that prescribed conversion; the original archive must still match below.
	for _, id := range []string{"L1-2", "L2-3", "L2-4", "L3-2"} {
		if access[id[:2]] {
			continue
		}
		old, exists := before[id[:2]]["1.0.0:"+id].(map[string]any)
		if !exists {
			continue
		}
		key := "current:" + id
		if id == "L2-3" {
			key = "1.1.0:" + id
		}
		if _, exists := before[id[:2]][key]; exists {
			continue
		}
		target, exists := after[id[:2]][key].(map[string]any)
		if exists && legacyLabInputsMatch(id, old, before["L3"]["1.0.0:L3-3"], target) {
			delete(after[id[:2]], key)
		}
	}
	for _, course := range []string{"L1", "L2", "L3"} {
		if !access[course] && !reflect.DeepEqual(before[course], after[course]) {
			return false
		}
	}
	return true
}

func legacyLabInputsMatch(id string, old map[string]any, initial any, target map[string]any) bool {
	for _, key := range []string{"prediction", "predictionDraft", "revisions", "derivation", "analysis"} {
		if !reflect.DeepEqual(old[key], target[key]) {
			return false
		}
	}
	if !reflect.DeepEqual(target["completion"], map[string]any{"confirmed": false, "confirmedAt": nil}) ||
		!reflect.DeepEqual(target["python"], map[string]any{"code": "", "result": nil}) {
		return false
	}
	inputs := func(source map[string]any, fromInitial bool) map[string]any {
		params, answers := map[string]any{}, map[string]any{}
		for key, spec := range phaseTwoVirtualLabTaskSpecs[id].Params {
			params[key] = spec.Default
		}
		for _, key := range phaseTwoVirtualLabTaskSpecs[id].Answers {
			answers[key] = ""
		}
		oldParams, _ := source["params"].(map[string]any)
		if id == "L1-2" {
			params["kind"] = oldParams["kind"]
			if params["kind"] == "gain" {
				params["kind"] = "delay"
			}
			if params["kind"] == "varying" {
				params["kind"] = "timescale"
			}
		} else {
			for key, value := range oldParams {
				params[key] = value
			}
			oldAnswers, _ := source["answers"].(map[string]any)
			for key, value := range oldAnswers {
				answers[key] = value
			}
			if id == "L3-2" {
				params["initial"], answers["b0"] = "0", "0"
				if fromInitial {
					params["initial"] = oldParams["initial"]
					answers["b0"] = oldAnswers["initialTerm"]
					answers["hShift"], answers["xGain"] = "1", "1"
				}
				delete(answers, "initialTerm")
			}
		}
		return map[string]any{"params": params, "answers": answers, "time": source["time"]}
	}
	expected := inputs(old, false)
	if !reflect.DeepEqual(expected["params"], target["params"]) || !reflect.DeepEqual(expected["answers"], target["answers"]) {
		return false
	}
	trials := []map[string]any{}
	if id != "L1-2" {
		for _, item := range old["trials"].([]any) {
			trials = append(trials, inputs(item.(map[string]any), false))
		}
		if id == "L3-2" && initial != nil {
			for _, item := range initial.(map[string]any)["trials"].([]any) {
				trials = append(trials, inputs(item.(map[string]any), true))
			}
		}
	}
	sort.SliceStable(trials, func(i, j int) bool { return trials[i]["time"].(string) < trials[j]["time"].(string) })
	if len(trials) > 200 {
		trials = trials[len(trials)-200:]
	}
	actual, _ := target["trials"].([]any)
	figures, _ := target["figures"].([]any)
	if len(actual) != len(trials) || len(figures) != len(trials) {
		return false
	}
	for i, expected := range trials {
		trial, ok := actual[i].(map[string]any)
		if !ok || !reflect.DeepEqual(expected, figures[i]) {
			return false
		}
		for key, value := range expected {
			if !reflect.DeepEqual(value, trial[key]) {
				return false
			}
		}
	}
	return true
}

func labCourseEvidence(document string) (map[string]map[string]any, bool) {
	result := map[string]map[string]any{"L1": {}, "L2": {}, "L3": {}}
	if document == "" {
		return result, true
	}
	var raw map[string]any
	if json.Unmarshal([]byte(document), &raw) != nil {
		return nil, false
	}
	sections := []map[string]any{raw}
	for _, key := range []string{"legacyArchive", "phaseTwoArchive"} {
		if archive, ok := raw[key].(map[string]any); ok {
			sections = append(sections, archive)
		}
	}
	for _, section := range sections {
		version, _ := section["appVersion"].(string)
		specs := virtualLabTaskSpecs
		if version == "1.0.0" {
			specs = legacyVirtualLabTaskSpecs
		}
		if version == "1.1.0" {
			specs = phaseTwoVirtualLabTaskSpecs
		}
		tasks, ok := section["tasks"].(map[string]any)
		if !ok {
			return nil, false
		}
		for id, value := range tasks {
			task, ok := value.(map[string]any)
			if !ok || len(id) < 2 || result[id[:2]] == nil {
				return nil, false
			}
			// Python was added without changing older schema versions.
			if task["python"] == nil {
				task["python"] = map[string]any{"code": "", "result": nil}
			}
			if blankLabTask(task, specs[id]) {
				continue
			}
			era := "current"
			if version == "1.0.0" && strings.Contains("|L1-2|L2-3|L2-4|L3-2|L3-3|", "|"+id+"|") {
				era = "1.0.0"
			}
			if era == "current" && version != "1.2.0" && (id == "L1-4" || id == "L2-3" || id == "L3-3") {
				era = "1.1.0"
			}
			result[id[:2]][era+":"+id] = task
		}
	}
	return result, true
}

func blankLabTask(task map[string]any, spec labTaskSpec) bool {
	for _, key := range []string{"prediction", "predictionDraft", "derivation", "analysis"} {
		if task[key] != "" {
			return false
		}
	}
	for _, key := range []string{"trials", "figures", "revisions"} {
		items, ok := task[key].([]any)
		if !ok || len(items) != 0 {
			return false
		}
	}
	if !reflect.DeepEqual(task["completion"], map[string]any{"confirmed": false, "confirmedAt": nil}) ||
		!reflect.DeepEqual(task["python"], map[string]any{"code": "", "result": nil}) {
		return false
	}
	params, ok := task["params"].(map[string]any)
	if !ok || len(params) != len(spec.Params) {
		return false
	}
	for key, value := range params {
		if !reflect.DeepEqual(value, spec.Params[key].Default) {
			return false
		}
	}
	answers, ok := task["answers"].(map[string]any)
	if !ok {
		return false
	}
	for _, value := range answers {
		if value != "" {
			return false
		}
	}
	return true
}
