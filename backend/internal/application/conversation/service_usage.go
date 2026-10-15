package conversation

import (
	"context"
	"strconv"
	"strings"

	appaudit "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/audit"
	model "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/conversation"
)

// SendMessageUsageInput 描述一次消息发送的运行时上下文。
// 运行结果在收口时由 ScheduleSendMessagePostTasks 补入。
type SendMessageUsageInput struct {
	UserID            uint
	ConversationID    uint
	Conversation      *model.Conversation
	PlatformModelName string
	ClientRunID       string
	Result            *SendMessageResult
}

// SendMessageAuditInput 描述一次消息发送对应的审计上下文。
type SendMessageAuditInput struct {
	UserID         uint
	RequestID      string
	ClientIP       string
	UserAgent      string
	Action         string
	ContentType    string
	ConversationID uint
	FileIDs        []string
	Result         *SendMessageResult
}

// ScheduleSendMessagePostTasks 在运行收口后安排上下文压缩与会话元数据生成。
// 未产生运行结果时不做任何事。
func (s *Service) ScheduleSendMessagePostTasks(ctx context.Context, input SendMessageUsageInput) {
	s.runPostGenerationTasks(ctx, input)
}

// scheduleConversationMetadataAfterGeneration 仅在主调用完成后安排标题与标签生成。
func (s *Service) scheduleConversationMetadataAfterGeneration(ctx context.Context, input SendMessageUsageInput) {
	if input.Conversation == nil || input.Result == nil || input.Result.MetadataRefreshHint != conversationMetadataRefreshPending {
		return
	}
	if strings.TrimSpace(input.Result.UserMessage.RunID) != strings.TrimSpace(input.ClientRunID) {
		return
	}
	conversation := *input.Conversation
	if platformModelName := strings.TrimSpace(input.Result.PlatformModelName); platformModelName != "" {
		conversation.Model = platformModelName
	}
	s.maybeGenerateConversationMetadataAsync(ctx, conversation, input.Result.UserMessage)
}

// RecordSendMessageAudit 记录发送消息审计日志。
func (s *Service) RecordSendMessageAudit(ctx context.Context, input SendMessageAuditInput) {
	if s.auditWriter == nil || input.Result == nil {
		return
	}
	imageCount, fileCount := countAttachmentKinds(input.Result.UserMessage.Attachments)
	s.auditWriter.Write(ctx, appaudit.WriteInput{
		RequestID:   input.RequestID,
		ActorUserID: input.UserID,
		Action:      input.Action,
		Resource:    "conversation",
		ResourceID:  strconv.FormatUint(uint64(input.ConversationID), 10),
		IP:          input.ClientIP,
		UserAgent:   input.UserAgent,
		Detail: map[string]any{
			"content_type": strings.TrimSpace(input.ContentType),
			"attachments":  imageCount + fileCount,
			"file_ids":     len(input.FileIDs),
		},
	})
}

func countAttachmentKinds(attachmentsJSON string) (int64, int64) {
	items := parseAttachmentSnapshotRefs(attachmentsJSON)

	var imageCount int64
	var fileCount int64
	for _, item := range items {
		switch normalizeAttachmentKind(item.Kind, item.MimeType) {
		case "image":
			imageCount++
		default:
			fileCount++
		}
	}
	return imageCount, fileCount
}
