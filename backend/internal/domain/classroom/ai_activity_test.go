package classroom

import (
	"testing"
	"time"
)

func activityTime(value string) time.Time {
	t, err := time.Parse(time.RFC3339, value)
	if err != nil {
		panic(err)
	}
	return t
}

func TestAIActivityCapsDeduplicationZeroWeeksAndProvisional(t *testing.T) {
	start := activityTime("2026-10-19T00:00:00+08:00")
	now := start.AddDate(0, 0, 16)
	end := now.AddDate(0, 0, 1)
	roster := []Student{{ID: 1, Username: "01", JoinedAt: start}, {ID: 2, Username: "02", JoinedAt: start}, {ID: 3, Username: "03", JoinedAt: now}}
	events := []AIActivityEvent{}
	// Five rounds on one day score only 50; two more days reach the weekly cap.
	for i := 1; i <= 5; i++ {
		events = append(events, AIActivityEvent{1, uint(i), start, start.Add(time.Duration(i) * time.Hour)})
	}
	for i := 6; i <= 7; i++ {
		events = append(events, AIActivityEvent{1, uint(i), start, start.AddDate(0, 0, i-5)})
	}
	// Retry an old success next week; it must never produce another active day.
	events = append(events, AIActivityEvent{1, 1, start, start.AddDate(0, 0, 7)})
	events = append(events, AIActivityEvent{1, 8, now, now})
	r := BuildAIActivity("c", roster, events, start, end, now)
	s := r.Students[0]
	if s.Final == nil || *s.Final != 50 || s.ExpectedWeeks != 2 || s.ActiveWeeks != 1 || s.ActiveDays != 3 || s.ValidRounds != 7 {
		t.Fatalf("unexpected totals: %+v", s)
	}
	if s.Weeks[0].Score != 100 || s.Weeks[0].CountedRounds != 4 || s.Weeks[1].Score != 0 || s.Weeks[2].Status != "provisional" || s.Weeks[2].Score != 40 {
		t.Fatalf("unexpected weeks: %+v", s.Weeks)
	}
	if r.Students[1].Final == nil || *r.Students[1].Final != 0 || r.Students[2].Final != nil {
		t.Fatalf("zero vs no assessment: %+v", r.Students)
	}
	oneDay := BuildAIActivity("c", roster[:1], events[:5], start, end, now).Students[0].Weeks[0]
	if oneDay.Score != 50 || oneDay.CountedRounds != 2 {
		t.Fatalf("daily cap: %+v", oneDay)
	}
}

func TestAIActivityBeijingBoundariesJoinAndRange(t *testing.T) {
	start := activityTime("2026-10-19T00:00:00+08:00")
	now := activityTime("2026-11-02T00:00:00+08:00")
	joined := activityTime("2026-10-25T15:59:00Z") // Sunday 23:59 Beijing.
	events := []AIActivityEvent{
		{1, 1, joined, joined},
		{1, 2, joined, joined.Add(time.Minute)},                     // Monday 00:00 Beijing.
		{1, 3, joined.Add(-time.Hour), joined.Add(2 * time.Minute)}, // Before enrollment.
		{1, 1, joined, joined.AddDate(0, 0, 1)},                     // Retry after range start.
	}
	roster := []Student{{ID: 1, JoinedAt: joined}}
	s := BuildAIActivity("c", roster, events, start, now, now).Students[0]
	if s.ExpectedWeeks != 2 || *s.Final != 40 || s.Weeks[0].ActiveDays != 1 || s.Weeks[1].ValidRounds != 1 {
		t.Fatalf("boundaries: %+v", s)
	}
	later := BuildAIActivity("c", roster, events, joined.Add(time.Minute), now, now).Students[0]
	if later.ValidRounds != 1 || later.ActiveDays != 1 {
		t.Fatalf("retry in later range counted again: %+v", later)
	}
	partial := BuildAIActivity("c", roster, events, start, joined.AddDate(0, 0, 2), now).Students[0]
	if partial.ExpectedWeeks != 1 || partial.Weeks[1].Status != "provisional" {
		t.Fatalf("partial end week: %+v", partial)
	}
}
