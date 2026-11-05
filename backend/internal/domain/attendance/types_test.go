package attendance

import (
	"testing"
	"time"
)

func TestCodeRotatesAndSessionDeadlineWins(t *testing.T) {
	now := time.Unix(1800000001, 0)
	s := Session{ID: "lesson", Secret: "test-only-secret", StartsAt: now, EndsAt: now.Add(time.Minute)}
	first, expires := s.Code(now)
	same, _ := s.Code(now.Add(time.Second))
	next, _ := s.Code(expires)
	if len(first) != 6 || first != same || first == next || expires.Unix()%30 != 0 {
		t.Fatalf("codes: %q %q %q %v", first, same, next, expires)
	}
	s.EndsAt = now.Add(5 * time.Second)
	_, expires = s.Code(now)
	if !expires.Equal(s.EndsAt) || s.Open(s.EndsAt) || s.Open(now.Add(-time.Second)) {
		t.Fatal("invalid time boundaries")
	}
}
