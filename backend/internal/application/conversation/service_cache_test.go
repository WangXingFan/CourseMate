package conversation

import (
	"testing"
	"time"
)

func TestCleanupExpiredInMemoryCaches(t *testing.T) {
	svc := &Service{}
	now := time.Now()

	svc.snapshotCache.Store(uint(1), &cachedSnapshot{expiresAt: now.Add(-time.Second)})
	svc.snapshotCache.Store(uint(2), &cachedSnapshot{expiresAt: now.Add(time.Minute)})

	svc.cleanupExpiredInMemoryCaches(now)

	if _, ok := svc.snapshotCache.Load(uint(1)); ok {
		t.Fatal("expected expired snapshot cache entry to be deleted")
	}
	if _, ok := svc.snapshotCache.Load(uint(2)); !ok {
		t.Fatal("expected fresh snapshot cache entry to remain")
	}
}
