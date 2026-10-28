package conversation

import (
	"testing"

	model "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/conversation"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/config"
)

func TestStrictRAGRefusesWithoutSelectedKnowledgeBaseAndIgnoresAttachments(t *testing.T) {
	service := &Service{}
	input := messageRAGRetrievalInput{
		cfg:   config.Config{RAGEnabled: true, RAGAnswerPolicy: config.RAGAnswerPolicyKnowledgeBase},
		input: SendMessageInput{Content: "general question"},
		fileContextPlan: conversationFileContextPlan{
			RAGAttachments:  []AttachmentInput{{FileID: "uploaded-file", ExtractedText: "unrelated upload"}},
			FullAttachments: []AttachmentInput{{FileID: "uploaded-file", ExtractedText: "unrelated upload", ContextMode: fileContextModeRAGFallback}},
		},
	}

	got, err := service.retrieveMessageRAGContext(t.Context(), input)
	if err != nil {
		t.Fatalf("retrieveMessageRAGContext() error = %v", err)
	}
	if got.strictRefusalText != ragStrictNoScopeRefusal {
		t.Fatalf("expected missing-scope refusal, got %q", got.strictRefusalText)
	}
	if len(got.fallbacks) != 0 || len(got.retrievalFallbacks) != 0 || len(got.chunks) != 0 {
		t.Fatalf("strict policy must not use uploaded-file fallbacks: %#v", got)
	}
}

func TestStrictRAGRefusesWhenSelectedKnowledgeBaseHasNoFiles(t *testing.T) {
	service := &Service{}
	input := messageRAGRetrievalInput{
		cfg:   config.Config{RAGEnabled: true, RAGAnswerPolicy: config.RAGAnswerPolicyKnowledgeBase},
		input: SendMessageInput{Content: "question", KnowledgeBaseIDs: []string{"kb-1"}},
		fileContextPlan: conversationFileContextPlan{
			RAGAttachments: []AttachmentInput{{FileID: "uploaded-file", ExtractedText: "not knowledge base evidence"}},
		},
	}

	got, err := service.retrieveMessageRAGContext(t.Context(), input)
	if err != nil {
		t.Fatalf("retrieveMessageRAGContext() error = %v", err)
	}
	if got.strictRefusalText != ragStrictNoEvidenceRefusal {
		t.Fatalf("expected no-evidence refusal, got %q", got.strictRefusalText)
	}
	if len(got.chunks) != 0 || len(got.fallbacks) != 0 {
		t.Fatalf("strict policy must not fall back to uploaded files: %#v", got)
	}
}

func TestRetainKnowledgeBaseRAGChunksDropsNonKnowledgeBaseEvidence(t *testing.T) {
	chunks := []model.RAGChunk{
		{FileID: "kb-file", Content: "selected evidence"},
		{FileID: "upload-file", Content: "uploaded attachment"},
	}
	got := retainKnowledgeBaseRAGChunks(chunks, map[string]struct{}{"kb-file": {}})
	if len(got) != 1 || got[0].FileID != "kb-file" {
		t.Fatalf("expected only selected knowledge base evidence, got %#v", got)
	}
}
