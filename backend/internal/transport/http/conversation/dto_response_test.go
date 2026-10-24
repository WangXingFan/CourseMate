package conversation

import (
	"testing"
	"time"

	model "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/conversation"
)

func TestTraceBlockResponseCarriesStartedAtWhenSet(t *testing.T) {
	started := time.Now().Add(-time.Minute)
	resp := toTraceBlockResponse(&model.MessageTraceBlock{
		Title:       "模型思考",
		Status:      "completed",
		RoundID:     "round_1",
		StartedAt:   started,
		UpdatedAt:   started.Add(30 * time.Second),
		PayloadJSON: `{"tool_calls":[]}`,
	})
	if resp == nil || resp.StartedAt == nil || !resp.StartedAt.Equal(started) {
		t.Fatalf("expected startedAt in block response, got %#v", resp)
	}
}

func TestTraceBlockResponseOmitsZeroStartedAt(t *testing.T) {
	resp := toTraceBlockResponse(&model.MessageTraceBlock{
		Title:       "处理",
		Status:      "completed",
		PayloadJSON: `{"tool_calls":[]}`,
	})
	if resp == nil || resp.StartedAt != nil {
		t.Fatalf("expected omitted startedAt for zero value, got %#v", resp)
	}
	if resp.PayloadJSON == "" {
		t.Fatalf("expected payload to survive mapping, got %#v", resp)
	}
}
