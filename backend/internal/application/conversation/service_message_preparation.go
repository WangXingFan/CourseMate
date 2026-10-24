package conversation

import (
	"context"
	"strings"
	"time"

	model "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/conversation"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/tokenestimate"
	"github.com/google/uuid"
)

type messageSendBranchPreparation struct {
	branchState            *messageBranchState
	normalizedBranchReason string
	reuseUserMessage       bool
}

// prepareMessageSendBranch 在消息落库前解析并规范化分支。
// 正常生成与重试/编辑分支共用该准备过程，保证祖先关系一致。
func (s *Service) prepareMessageSendBranch(ctx context.Context, input *SendMessageInput) (*messageSendBranchPreparation, error) {
	if input == nil {
		return nil, ErrInvalidMessageContent
	}

	normalizedBranchReason := normalizeBranchReason(input.BranchReason)
	branchState, err := s.resolveMessageBranch(
		ctx,
		input.ConversationID,
		input.UserID,
		input.ParentMessagePublicID,
		input.SourceMessagePublicID,
		normalizedBranchReason,
	)
	if err != nil {
		return nil, err
	}

	reuseUserMessage := branchState.ReuseUserMessage != nil
	if reuseUserMessage {
		input.Content = branchState.ReuseUserMessage.Content
		input.FileIDs = parseAttachmentSnapshotFileIDs(branchState.ReuseUserMessage.Attachments)
	}
	maxFiles := s.cfg.Snapshot().MaxMessageFiles
	if maxFiles <= 0 {
		maxFiles = 10
	}
	if len(input.FileIDs) > maxFiles {
		return nil, ErrTooManyMessageFiles
	}

	return &messageSendBranchPreparation{
		branchState:            branchState,
		normalizedBranchReason: normalizedBranchReason,
		reuseUserMessage:       reuseUserMessage,
	}, nil
}

type messagePair struct {
	user      *model.Message
	assistant *model.Message
}

// createMessagePair 为已准备的分支原子写入用户消息、助手占位消息与附件引用。
func (s *Service) createMessagePair(
	ctx context.Context,
	input SendMessageInput,
	runID string,
	preparation *messageSendBranchPreparation,
	resolvedAttachments []AttachmentInput,
) (*messagePair, error) {
	if preparation == nil || preparation.branchState == nil {
		return nil, ErrInvalidMessageBranch
	}

	userContentEstimatedInputTokens := tokenestimate.Estimate(input.Content)
	assistantMessage := &model.Message{
		ConversationID:   input.ConversationID,
		UserID:           input.UserID,
		PublicID:         normalizePublicID(uuid.NewString()),
		RunID:            runID,
		Role:             "assistant",
		ContentType:      "text",
		Content:          "",
		BranchReason:     preparation.normalizedBranchReason,
		TokenUsage:       0,
		InputTokens:      0,
		OutputTokens:     0,
		CacheReadTokens:  0,
		CacheWriteTokens: 0,
		ReasoningTokens:  0,
		LatencyMS:        0,
		Status:           "pending",
		Attachments:      "[]",
	}

	if preparation.reuseUserMessage {
		reused := *preparation.branchState.ReuseUserMessage
		userMessage := &reused
		assistantMessage.ParentMessageID = &userMessage.ID
		assistantMessage.SourceMessageID = preparation.branchState.SourceMessageID
		if err := s.repo.CreateAssistantBranchMessage(ctx, assistantMessage); err != nil {
			return nil, mapMessageWriteError(err)
		}
		assistantMessage.ParentPublicID = userMessage.PublicID
		assistantMessage.SourcePublicID = preparation.branchState.SourcePublicID
		return &messagePair{user: userMessage, assistant: assistantMessage}, nil
	}

	attachmentsJSON := []byte(marshalAttachmentSnapshots(resolvedAttachments))
	userMessage := &model.Message{
		ConversationID:  input.ConversationID,
		UserID:          input.UserID,
		PublicID:        normalizePublicID(uuid.NewString()),
		ParentMessageID: preparation.branchState.ParentMessageID,
		RunID:           runID,
		Role:            "user",
		ContentType:     fallbackContentType(input.ContentType),
		Content:         input.Content,
		BranchReason:    preparation.normalizedBranchReason,
		SourceMessageID: preparation.branchState.SourceMessageID,
		TokenUsage:      userContentEstimatedInputTokens,
		InputTokens:     userContentEstimatedInputTokens,
		Attachments:     string(attachmentsJSON),
		Status:          "pending",
	}
	attachmentRows := make([]model.Attachment, 0, len(resolvedAttachments))
	now := time.Now()
	for _, item := range resolvedAttachments {
		attachmentRows = append(attachmentRows, model.Attachment{
			ConversationID: input.ConversationID,
			UserID:         input.UserID,
			FileID:         strings.TrimSpace(item.FileID),
			Kind:           normalizeAttachmentKind(item.Kind, item.MimeType),
			FileName:       strings.TrimSpace(item.FileName),
			MimeType:       strings.TrimSpace(item.MimeType),
			FileSize:       item.FileSize,
			SHA256:         strings.TrimSpace(item.SHA256),
			StoragePath:    strings.TrimSpace(item.StoragePath),
			Status:         "active",
			MetaJSON:       strings.TrimSpace(item.MetaJSON),
			UploadedAt:     now,
		})
	}

	if err := s.repo.CreateMessagePairWithUserAttachments(ctx, userMessage, assistantMessage, attachmentRows); err != nil {
		return nil, mapMessageWriteError(err)
	}
	userMessage.ParentPublicID = preparation.branchState.ParentPublicID
	userMessage.SourcePublicID = preparation.branchState.SourcePublicID
	assistantMessage.ParentPublicID = userMessage.PublicID
	return &messagePair{user: userMessage, assistant: assistantMessage}, nil
}
