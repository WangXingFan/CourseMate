package learning

import (
	"testing"
	"time"
)

func TestReviewSchedule(t *testing.T) {
	now := time.Date(2026, 10, 19, 23, 0, 0, 0, time.FixedZone("local", 8*3600))
	for stage, days := range []int{3, 7, 14, 30, 0, 0} {
		next, due := ScheduleReview(stage, true, now)
		want := min(stage+1, 5)
		if next != want {
			t.Fatalf("stage %d: got %d", stage, next)
		}
		if days == 0 {
			if due != nil {
				t.Fatal("completed review remains due")
			}
			continue
		}
		if due == nil || !due.Equal(now.Add(time.Duration(days)*24*time.Hour)) || due.Location() != time.UTC {
			t.Fatalf("stage %d: %v", stage, due)
		}
	}
	for stage := 0; stage <= 5; stage++ {
		next, due := ScheduleReview(stage, false, now)
		if next != 0 || due == nil || !due.Equal(now.Add(24*time.Hour)) {
			t.Fatalf("reset %d: %d %v", stage, next, due)
		}
	}
}
