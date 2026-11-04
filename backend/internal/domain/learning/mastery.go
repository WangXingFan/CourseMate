package learning

import (
	"sort"
	"strings"
	"time"
)

const MasteryWindowDays = 90

// Evidence comes from server-graded answers. Viewing a page or completing a
// simulation is not evidence of knowledge mastery.
type MasteryEvidence struct {
	UserID                                uint
	ConceptID, QuestionID, Source, Prompt string
	Correct                               bool
	At                                    time.Time
}

type MasteryConcept struct {
	ID, Kind, Title, Topic, Chapter, LessonID, ReviewHref, PracticeHref string
	Status                                                              string
	Questions, Correct                                                  int
	LastAt                                                              *time.Time
	Evidence                                                            []MasteryEvidence
}

type MasteryCounts struct{ Total, Assessed, Weak, Developing, Secure int }
type MasteryWeek struct {
	Start            string
	Answers, Correct int
}
type MasteryProfile struct {
	Concepts  []MasteryConcept
	Counts    MasteryCounts
	Weeks     []MasteryWeek
	UpdatedAt *time.Time
}

func masteryCatalog() []MasteryConcept {
	items := []MasteryConcept{}
	for _, lesson := range PracticeCourseLessons() {
		items = append(items, MasteryConcept{ID: "lesson:" + lesson.ID, Kind: "course", Title: lesson.Number + " · " + lesson.Title, Chapter: lesson.Chapter, LessonID: lesson.ID, ReviewHref: "/learn/knowledge?lesson=" + lesson.ID, PracticeHref: "/activities"})
	}
	seen := map[string]bool{}
	for _, q := range Questions() {
		if seen[q.Topic] {
			continue
		}
		seen[q.Topic] = true
		items = append(items, MasteryConcept{ID: "topic:" + q.Topic, Kind: "practice", Topic: q.Topic, Chapter: q.ChapterID, ReviewHref: q.Lesson, PracticeHref: "/learn/quiz?topic=" + q.Topic})
	}
	return items
}

// Per-question latest answers avoid inflating mastery by repeating one item.
// Two most recent distinct items must both be correct to count as secure.
func BuildMastery(evidence []MasteryEvidence, now time.Time) MasteryProfile {
	profile := MasteryProfile{Concepts: masteryCatalog(), Weeks: []MasteryWeek{}}
	since := now.AddDate(0, 0, -MasteryWindowDays)
	byConcept := map[string]map[string]MasteryEvidence{}
	day := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	weekStart := day.AddDate(0, 0, -(int(day.Weekday())+6)%7)
	for i := 5; i >= 0; i-- {
		profile.Weeks = append(profile.Weeks, MasteryWeek{Start: weekStart.AddDate(0, 0, -7*i).Format("2006-01-02")})
	}
	for _, item := range evidence {
		if item.At.Before(since) || item.At.After(now) {
			continue
		}
		if profile.UpdatedAt == nil || item.At.After(*profile.UpdatedAt) {
			at := item.At
			profile.UpdatedAt = &at
		}
		if byConcept[item.ConceptID] == nil {
			byConcept[item.ConceptID] = map[string]MasteryEvidence{}
		}
		previous, exists := byConcept[item.ConceptID][item.QuestionID]
		if !exists || !item.At.Before(previous.At) {
			byConcept[item.ConceptID][item.QuestionID] = item
		}
		for i := range profile.Weeks {
			start, _ := time.Parse("2006-01-02", profile.Weeks[i].Start)
			if !item.At.Before(start) && item.At.Before(start.AddDate(0, 0, 7)) {
				profile.Weeks[i].Answers++
				if item.Correct {
					profile.Weeks[i].Correct++
				}
				break
			}
		}
	}
	for i := range profile.Concepts {
		concept := &profile.Concepts[i]
		concept.Status = "unassessed"
		concept.Evidence = []MasteryEvidence{}
		for _, item := range byConcept[concept.ID] {
			concept.Evidence = append(concept.Evidence, item)
			if item.Correct {
				concept.Correct++
			}
		}
		sort.Slice(concept.Evidence, func(i, j int) bool {
			a, b := concept.Evidence[i], concept.Evidence[j]
			if !a.At.Equal(b.At) {
				return a.At.After(b.At)
			}
			// Questions submitted together have no meaningful order. Put any
			// wrong answer first so a mixed submission cannot appear secure.
			if a.Correct != b.Correct {
				return !a.Correct
			}
			return a.QuestionID < b.QuestionID
		})
		concept.Questions = len(concept.Evidence)
		if concept.Questions == 0 {
			continue
		}
		at := concept.Evidence[0].At
		concept.LastAt = &at
		concept.Status = "developing"
		if !concept.Evidence[0].Correct {
			concept.Status = "weak"
		} else if len(concept.Evidence) > 1 && concept.Evidence[1].Correct {
			concept.Status = "secure"
		}
		concept.Evidence = concept.Evidence[:min(5, len(concept.Evidence))]
		if concept.Kind == "practice" && concept.Status != "secure" {
			question := concept.Evidence[0].QuestionID
			if base, ok := strings.CutPrefix(question, "practice:"); ok {
				if FindQuestion(base) != nil {
					concept.PracticeHref = "/learn/quiz?question=" + base
				}
			}
		}
	}
	profile.Counts = CountMastery(profile.Concepts)
	return profile
}

func CountMastery(concepts []MasteryConcept) MasteryCounts {
	result := MasteryCounts{Total: len(concepts)}
	for _, item := range concepts {
		switch item.Status {
		case "weak":
			result.Weak++
		case "developing":
			result.Developing++
		case "secure":
			result.Secure++
		}
	}
	result.Assessed = result.Weak + result.Developing + result.Secure
	return result
}
