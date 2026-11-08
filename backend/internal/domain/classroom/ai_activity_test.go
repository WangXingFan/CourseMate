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
		events = append(events, AIActivityEvent{UserID: 1, RootMessageID: uint(i), QuestionAt: start, At: start.Add(time.Duration(i) * time.Hour)})
	}
	for i := 6; i <= 7; i++ {
		events = append(events, AIActivityEvent{UserID: 1, RootMessageID: uint(i), QuestionAt: start, At: start.AddDate(0, 0, i-5)})
	}
	// Retry an old success next week; it must never produce another active day.
	events = append(events, AIActivityEvent{UserID: 1, RootMessageID: 1, QuestionAt: start, At: start.AddDate(0, 0, 7)})
	events = append(events, AIActivityEvent{UserID: 1, RootMessageID: 8, QuestionAt: now, At: now})
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
		{UserID: 1, RootMessageID: 1, QuestionAt: joined, At: joined},
		{UserID: 1, RootMessageID: 2, QuestionAt: joined, At: joined.Add(time.Minute)},                     // Monday 00:00 Beijing.
		{UserID: 1, RootMessageID: 3, QuestionAt: joined.Add(-time.Hour), At: joined.Add(2 * time.Minute)}, // Before enrollment.
		{UserID: 1, RootMessageID: 1, QuestionAt: joined, At: joined.AddDate(0, 0, 1)},                     // Retry after range start.
	}
	roster := []Student{{ID: 1, JoinedAt: joined}}
	s := BuildAIActivity("c", roster, events, start, now, now).Students[0]
	if s.ExpectedWeeks != 2 || *s.Final != 45 || s.Weeks[0].ActiveDays != 1 || s.Weeks[1].ValidRounds != 1 {
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

func TestAIActivityBonusPathsCapAndRangeContinuity(t *testing.T) {
	start := activityTime("2026-11-02T00:00:00+08:00")
	end := start.AddDate(0, 0, 21)
	roster := []Student{{ID: 1, JoinedAt: start}}
	event := func(id uint, day, hour int, parent uint, source string) AIActivityEvent {
		at := start.AddDate(0, 0, day).Add(time.Duration(hour) * time.Hour)
		return AIActivityEvent{UserID: 1, RootMessageID: id, QuestionAt: at, At: at.Add(time.Minute), FollowupToRootMessageID: parent, LearningSource: source}
	}
	// The old path still gives full credit without any optional evidence.
	old := []AIActivityEvent{event(1, 0, 1, 0, ""), event(2, 0, 2, 0, ""), event(3, 1, 1, 0, ""), event(4, 1, 2, 0, "")}
	w := BuildAIActivity("c", roster, old, start, end, end).Students[0].Weeks[0]
	if w.BaseScore != 100 || w.Score != 100 || w.BonusScore != 0 {
		t.Fatalf("original full-credit path changed: %+v", w)
	}
	events := append(old, event(5, 7, 1, 0, "correction"), event(6, 7, 2, 5, "lesson"), event(7, 7, 3, 6, ""))
	r := BuildAIActivity("c", roster, events, start, end, end)
	w = r.Students[0].Weeks[1]
	if w.BaseScore != 50 || w.ConsecutiveWeeks != 2 || w.ContinuityScore != 10 || w.FollowupScore != 20 || w.LearningScore != 20 || w.BonusScore != 50 || w.Score != 100 {
		t.Fatalf("bonus paths failed to reach full credit: %+v", w)
	}
	// A retry in a later week cannot generate new base, learning or follow-up credit.
	retry := events[len(events)-1]
	retry.At = start.AddDate(0, 0, 14).Add(time.Hour)
	events = append(events, retry, event(8, 7, 4, 7, "experiment"))
	r = BuildAIActivity("c", roster, events, start, end, end)
	w = r.Students[0].Weeks[1]
	if w.Score != 100 || w.FollowupRounds != 3 || w.LearningRounds != 3 || r.Students[0].Weeks[2].Score != 0 {
		t.Fatalf("cap, retry or carry-over failed: %+v", r.Students[0].Weeks)
	}
	// Once the base reaches 90, only the remaining 10 bonus points may be applied.
	events = append(events, event(9, 8, 1, 0, ""))
	w = BuildAIActivity("c", roster, events, start, end, end).Students[0].Weeks[1]
	if w.BaseScore != 90 || w.BonusScore != 10 || w.Score != 100 {
		t.Fatalf("partial bonus cap: %+v", w)
	}
	filtered := BuildAIActivity("c", roster, events, start.AddDate(0, 0, 7), end, end).Students[0].Weeks[0]
	if filtered != w {
		t.Fatalf("date selection lost continuity: %+v vs %+v", filtered, w)
	}
	joined := []Student{{ID: 1, JoinedAt: start.AddDate(0, 0, 7)}}
	w = BuildAIActivity("c", joined, events, start, end, end).Students[0].Weeks[0]
	if w.ConsecutiveWeeks != 1 || w.ContinuityScore != 0 {
		t.Fatalf("pre-enrollment activity earned continuity: %+v", w)
	}
}

func TestAIActivityFollowupRequiresEligibleSuccessfulParent(t *testing.T) {
	start := activityTime("2026-11-02T00:00:00+08:00")
	end := start.AddDate(0, 0, 7)
	roster := []Student{{ID: 1, JoinedAt: start}}
	events := []AIActivityEvent{
		{UserID: 2, RootMessageID: 1, QuestionAt: start, At: start},
		{UserID: 1, RootMessageID: 2, QuestionAt: start.Add(-time.Hour), At: start},
		{UserID: 1, RootMessageID: 3, QuestionAt: start, At: start.Add(2 * time.Hour)},
		{UserID: 1, RootMessageID: 4, QuestionAt: start, At: start, FollowupToRootMessageID: 1},
		{UserID: 1, RootMessageID: 5, QuestionAt: start, At: start, FollowupToRootMessageID: 2},
		{UserID: 1, RootMessageID: 6, QuestionAt: start, At: start, FollowupToRootMessageID: 3},
		{UserID: 1, RootMessageID: 7, QuestionAt: start, At: start, FollowupToRootMessageID: 99, LearningSource: "unknown"},
	}
	w := BuildAIActivity("c", roster, events, start, end, end).Students[0].Weeks[0]
	if w.FollowupRounds != 0 || w.LearningRounds != 0 || w.BonusScore != 0 {
		t.Fatalf("invalid bonus evidence counted: %+v", w)
	}
}
