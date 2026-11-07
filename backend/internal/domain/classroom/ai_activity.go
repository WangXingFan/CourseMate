package classroom

import (
	"math"
	"sort"
	"time"
)

const AIActivityVersion = "ai-activity-v1"

var AIActivityLocation = time.FixedZone("Asia/Shanghai", 8*60*60)

type AIActivityOptions struct {
	StartDate string
	EndDate   string
}

// Events contain no chat content. At is the first successful attempt's start time;
// QuestionAt is the original question's time, including across edit/retry branches.
type AIActivityEvent struct {
	UserID        uint
	RootMessageID uint
	QuestionAt    time.Time
	At            time.Time
}

type AIActivityWeek struct {
	StartDate     string
	EndDate       string
	Status        string
	ActiveDays    int
	ValidRounds   int
	CountedRounds int
	DayScore      int
	RoundScore    int
	Score         int
}

type AIActivityStudent struct {
	UserID        uint
	StudentID     string
	Username      string
	Name          string
	ExpectedWeeks int
	ActiveWeeks   int
	ActiveDays    int
	ValidRounds   int
	Final         *float64
	Weeks         []AIActivityWeek
}

type AIActivityReport struct {
	Version     string
	ClassroomID string
	StartDate   string
	EndDate     string
	GeneratedAt time.Time
	Students    []AIActivityStudent
}

func aiActivityMonday(t time.Time) time.Time {
	t = t.In(AIActivityLocation)
	day := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, AIActivityLocation)
	return day.AddDate(0, 0, -(int(t.Weekday())+6)%7)
}

// BuildAIActivity receives an inclusive start and exclusive end. Weeks ending
// after the selected range or now are provisional and never dilute the average.
func BuildAIActivity(id string, roster []Student, events []AIActivityEvent, start, end, now time.Time) *AIActivityReport {
	r := &AIActivityReport{Version: AIActivityVersion, ClassroomID: id, StartDate: start.In(AIActivityLocation).Format(time.DateOnly), EndDate: end.In(AIActivityLocation).AddDate(0, 0, -1).Format(time.DateOnly), GeneratedAt: now, Students: []AIActivityStudent{}}
	// Deduplicate before filtering dates: retrying an old question in a new week
	// or selecting a later reporting range must not award another round.
	first := map[uint]AIActivityEvent{}
	for _, e := range events {
		if prior, ok := first[e.RootMessageID]; !ok || e.At.Before(prior.At) {
			first[e.RootMessageID] = e
		}
	}
	byStudent := map[uint][]AIActivityEvent{}
	for _, e := range first {
		byStudent[e.UserID] = append(byStudent[e.UserID], e)
	}
	for _, st := range roster {
		row := AIActivityStudent{UserID: st.ID, StudentID: st.PublicID, Username: st.Username, Name: st.DisplayName, Weeks: []AIActivityWeek{}}
		eligibleFrom := start
		if st.JoinedAt.After(eligibleFrom) {
			eligibleFrom = st.JoinedAt
		}
		days := map[string]int{}
		for _, e := range byStudent[st.ID] {
			if e.QuestionAt.Before(st.JoinedAt) || e.At.Before(eligibleFrom) || !e.At.Before(end) || e.At.After(now) {
				continue
			}
			days[e.At.In(AIActivityLocation).Format(time.DateOnly)]++
		}
		total := 0
		for week := aiActivityMonday(eligibleFrom); eligibleFrom.Before(end) && !eligibleFrom.After(now) && week.Before(end) && !week.After(now); week = week.AddDate(0, 0, 7) {
			next := week.AddDate(0, 0, 7)
			w := AIActivityWeek{StartDate: week.Format(time.DateOnly), EndDate: next.AddDate(0, 0, -1).Format(time.DateOnly), Status: "provisional"}
			if !next.After(end) && !next.After(now) {
				w.Status = "closed"
			}
			for day := week; day.Before(next); day = day.AddDate(0, 0, 1) {
				n := days[day.Format(time.DateOnly)]
				if n > 0 {
					w.ActiveDays++
					w.ValidRounds += n
					w.CountedRounds += min(n, 2)
				}
			}
			w.CountedRounds = min(w.CountedRounds, 4)
			w.DayScore, w.RoundScore = min(w.ActiveDays, 2)*30, w.CountedRounds*10
			w.Score = w.DayScore + w.RoundScore
			row.Weeks = append(row.Weeks, w)
			if w.Status == "closed" {
				row.ExpectedWeeks++
				if w.ActiveDays > 0 {
					row.ActiveWeeks++
				}
				row.ActiveDays += w.ActiveDays
				row.ValidRounds += w.ValidRounds
				total += w.Score
			}
		}
		if row.ExpectedWeeks > 0 {
			score := math.Round(float64(total)/float64(row.ExpectedWeeks)*100) / 100
			row.Final = &score
		}
		r.Students = append(r.Students, row)
	}
	sort.SliceStable(r.Students, func(i, j int) bool { return r.Students[i].Username < r.Students[j].Username })
	return r
}
