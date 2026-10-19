package learning

import "time"

// ScheduleReview uses the supplied clock, independent of retries and time zones.
func ScheduleReview(stage int, correct bool, now time.Time) (int, *time.Time) {
	if stage < 0 || stage > 5 {
		stage = 0
	}
	if !correct {
		stage = 0
	} else if stage < 5 {
		stage++
	}
	if stage == 5 {
		return stage, nil
	}
	days := [...]int{1, 3, 7, 14, 30}
	due := now.UTC().Add(time.Duration(days[stage]) * 24 * time.Hour)
	return stage, &due
}
