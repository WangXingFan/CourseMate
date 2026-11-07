package classroom

import (
	"fmt"
	"math"
	"sort"
	"time"
)

const PerformanceVersion = "classroom-performance-v1"

type PerformanceOptions struct {
	StartAt *time.Time
	EndAt   *time.Time
	QuizIDs []string
}

type PerformanceStage struct {
	Phase         string
	Expected      int
	Completed     int
	Quality       float64
	Participation float64
}

// Evidence contains scored results, never the answer keys from question snapshots.
type PerformanceEvidence struct {
	QuizID       string
	Title        string
	Phase        string
	SourceQuizID string
	QuestionID   string
	ConceptID    string
	ClosedAt     time.Time
	Submitted    bool
	Points       int
	Total        int
	Outcome      string
}

type PerformanceStudent struct {
	UserID        uint
	StudentID     string
	Username      string
	Name          string
	Stages        []PerformanceStage
	Quality       float64
	Participation float64
	Growth        *float64
	Consistency   float64
	ExpectedWeeks int
	ActiveWeeks   int
	Pairs         int
	Improved      int
	Retained      int
	Regressed     int
	Unresolved    int
	MissingPairs  int
	Raw           *float64
	Rank          *float64
	Converted     *float64
	Final         *float64
	Reason        string
	Status        string
	Evidence      []PerformanceEvidence
}

type PerformanceActivity struct {
	ID           string
	Title        string
	Phase        string
	SourceQuizID string
	ClosedAt     time.Time
}

type PerformanceReport struct {
	Version     string
	ClassroomID string
	Options     PerformanceOptions
	Mean        float64
	Deviation   float64
	Eligible    int
	Conversion  string
	Activities  []PerformanceActivity
	Students    []PerformanceStudent
	Fingerprint string
}

type PerformanceRecord struct {
	ID          string
	ClassroomID uint
	Title       string
	CreatedAt   time.Time
	Report      PerformanceReport
}

type PerformanceInput struct {
	Quiz        Quiz
	Submissions map[uint]QuizSubmission
}

// BuildPerformance expects only closed activities from the authorized class and range.
func BuildPerformance(classroomID string, roster []Student, inputs []PerformanceInput, options PerformanceOptions) (*PerformanceReport, error) {
	r := &PerformanceReport{Version: PerformanceVersion, ClassroomID: classroomID, Options: options, Mean: 80, Deviation: 8, Activities: []PerformanceActivity{}, Students: []PerformanceStudent{}}
	originals := map[string]PerformanceInput{}
	for _, input := range inputs {
		q := input.Quiz
		if q.ClosedAt == nil {
			return nil, fmt.Errorf("quiz %s: missing close time", q.PublicID)
		}
		r.Activities = append(r.Activities, PerformanceActivity{q.PublicID, q.Title, q.Phase, q.SourceQuizID, *q.ClosedAt})
		if q.SourceQuizID == "" {
			originals[q.PublicID] = input
		}
	}
	for _, st := range roster {
		row := PerformanceStudent{UserID: st.ID, StudentID: st.PublicID, Username: st.Username, Name: st.DisplayName, Status: "no_data", Stages: []PerformanceStage{}, Evidence: []PerformanceEvidence{}}
		stages := map[string]*PerformanceStage{}
		for _, phase := range []string{QuizPhasePreClass, QuizPhaseInClass, QuizPhaseAfterClass} {
			stages[phase] = &PerformanceStage{Phase: phase}
		}
		weeks, active := map[string]bool{}, map[string]bool{}
		participated := false
		growth := 0.0
		for _, input := range inputs {
			q := input.Quiz
			if q.ClosedAt.Before(st.JoinedAt) {
				continue
			}
			sub, submitted := input.Submissions[st.ID]
			var source PerformanceInput
			if q.SourceQuizID != "" {
				var ok bool
				source, ok = originals[q.SourceQuizID]
				if !ok || source.Quiz.ClosedAt.Before(st.JoinedAt) {
					continue
				}
			} else {
				year, week := q.ClosedAt.In(time.FixedZone("Asia/Shanghai", 8*3600)).ISOWeek()
				key := fmt.Sprintf("%d-%02d", year, week)
				weeks[key] = true
				if submitted {
					active[key] = true
				}
			}
			participated = participated || submitted
			for index, question := range q.Questions {
				points, total, valid := QuizAnswerScore(sub, index, question)
				if total == 0 || submitted && !valid {
					return nil, fmt.Errorf("quiz %s submission %d question %s: invalid scoring evidence", q.PublicID, sub.ID, question.ID)
				}
				e := PerformanceEvidence{QuizID: q.PublicID, Title: q.Title, Phase: q.Phase, SourceQuizID: q.SourceQuizID, QuestionID: question.ID, ConceptID: question.ConceptID, ClosedAt: *q.ClosedAt, Submitted: submitted, Points: points, Total: total}
				if q.SourceQuizID == "" {
					stage := stages[q.Phase]
					if stage == nil {
						return nil, fmt.Errorf("quiz %s: unknown phase %s", q.PublicID, q.Phase)
					}
					stage.Expected++
					if submitted {
						stage.Completed++
						stage.Quality += float64(points) / float64(total) * 100
					}
				} else {
					beforeIndex := -1
					for j, before := range source.Quiz.Questions {
						if question.ConceptID != "" && before.ConceptID == question.ConceptID {
							beforeIndex = j
							break
						}
					}
					if beforeIndex < 0 {
						continue
					}
					row.Pairs++
					pre, hasPre := source.Submissions[st.ID]
					prePoints, preTotal, preValid := QuizAnswerScore(pre, beforeIndex, source.Quiz.Questions[beforeIndex])
					if hasPre && !preValid {
						return nil, fmt.Errorf("quiz %s submission %d: invalid paired evidence", source.Quiz.PublicID, pre.ID)
					}
					e.Outcome = "missing"
					if submitted && hasPre {
						growth += float64(points) / float64(total) * 100
						switch {
						case points == total && prePoints == preTotal:
							e.Outcome = "retained"
							row.Retained++
						case points == total:
							e.Outcome = "improved"
							row.Improved++
						case prePoints == preTotal:
							e.Outcome = "regressed"
							row.Regressed++
						default:
							e.Outcome = "unresolved"
							row.Unresolved++
						}
					} else {
						row.MissingPairs++
					}
				}
				row.Evidence = append(row.Evidence, e)
			}
		}
		weights := map[string]float64{QuizPhasePreClass: .3, QuizPhaseInClass: .4, QuizPhaseAfterClass: .3}
		stageWeight := 0.0
		for _, phase := range []string{QuizPhasePreClass, QuizPhaseInClass, QuizPhaseAfterClass} {
			stage := stages[phase]
			if stage.Expected > 0 {
				stage.Quality /= float64(stage.Expected)
				stage.Participation = float64(stage.Completed) / float64(stage.Expected) * 100
				row.Quality += stage.Quality * weights[phase]
				row.Participation += stage.Participation * weights[phase]
				stageWeight += weights[phase]
			}
			row.Stages = append(row.Stages, *stage)
		}
		row.ExpectedWeeks, row.ActiveWeeks = len(weeks), len(active)
		if stageWeight > 0 {
			row.Quality /= stageWeight
			row.Participation /= stageWeight
			row.Consistency = float64(len(active)) / float64(len(weeks)) * 100
			value := .5*row.Quality + .2*row.Participation + .1*row.Consistency
			if row.Pairs > 0 {
				g := growth / float64(row.Pairs)
				row.Growth = &g
				value += .2 * g
			} else {
				value /= .8
			}
			row.Raw = &value
			row.Status = "not_participated"
			if participated {
				row.Status = "assessed"
				r.Eligible++
			}
			final := math.Round(value*10) / 10
			row.Final = &final
		}
		r.Students = append(r.Students, row)
	}
	convertPerformance(r)
	return r, nil
}

func convertPerformance(r *PerformanceReport) {
	indices := []int{}
	for i, s := range r.Students {
		if s.Status == "assessed" {
			indices = append(indices, i)
		}
	}
	sort.SliceStable(indices, func(i, j int) bool {
		return math.Round(*r.Students[indices[i]].Raw) < math.Round(*r.Students[indices[j]].Raw)
	})
	r.Conversion = "normal"
	if len(indices) < 10 {
		r.Conversion = "small_class"
	} else if math.Round(*r.Students[indices[0]].Raw) == math.Round(*r.Students[indices[len(indices)-1]].Raw) {
		r.Conversion = "all_tied"
	}
	for start := 0; start < len(indices); {
		end := start + 1
		for end < len(indices) && math.Round(*r.Students[indices[end]].Raw) == math.Round(*r.Students[indices[start]].Raw) {
			end++
		}
		ascending := float64(start+1+end) / 2
		rank := float64(len(indices)) + 1 - ascending
		p := (ascending - .5) / float64(len(indices))
		value := math.Round(math.Max(0, math.Min(100, r.Mean+r.Deviation*math.Sqrt2*math.Erfinv(2*p-1)))*10) / 10
		for _, i := range indices[start:end] {
			s := &r.Students[i]
			v := rank
			s.Rank = &v
			if r.Conversion == "normal" {
				n := value
				s.Converted = &n
				f := value
				s.Final = &f
			}
		}
		start = end
	}
}
