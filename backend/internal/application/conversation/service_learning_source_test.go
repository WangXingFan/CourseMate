package conversation

import (
	"context"
	"testing"

	model "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/conversation"
)

func TestLearningSourcePersistsOnQuestionAndSurvivesRegeneration(t *testing.T) {
	repo := &conversationRunClaimRepositoryStub{}
	s := &Service{repo: repo}
	input := SendMessageInput{UserID: 1, ConversationID: 1, Content: "learning question", LearningSource: "correction"}
	pair, err := s.createMessagePair(context.Background(), input, "one", &messageSendBranchPreparation{branchState: &messageBranchState{}, normalizedBranchReason: "default"}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if pair.user.LearningSource != "correction" || pair.assistant.LearningSource != "" {
		t.Fatal("learning evidence must be attached to the submitted question only")
	}
	input.LearningSource = "experiment"
	reused := model.Message{ID: 1, LearningSource: pair.user.LearningSource}
	pair, err = s.createMessagePair(context.Background(), input, "retry", &messageSendBranchPreparation{branchState: &messageBranchState{ReuseUserMessage: &reused}, normalizedBranchReason: "retry", reuseUserMessage: true}, nil)
	if err != nil || pair.user.LearningSource != "correction" || repo.pairCreateCalls != 1 || repo.branchCreateCalls != 1 {
		t.Fatalf("regeneration changed the original evidence: %+v %v", pair, err)
	}
}
