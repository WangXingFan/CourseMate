package conversation

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/channel"
	model "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/conversation"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/ports/llm"
)

func reasoningPayload(delta *llm.ReasoningDelta) *tracePayload {
	if delta == nil {
		return nil
	}
	payload := &tracePayload{Reasoning: &traceReasoning{EventType: delta.EventType, ItemID: delta.ItemID, Status: delta.Status}}
	if strings.TrimSpace(delta.Signature) != "" {
		payload.Reasoning.Signature = strings.TrimSpace(delta.Signature)
	}
	if strings.TrimSpace(delta.EncryptedContent) != "" {
		payload.Reasoning.EncryptedContent = strings.TrimSpace(delta.EncryptedContent)
	}
	return payload
}

// callCompactLLM 是注入到 compact.Service 的 LLM 摘要回调。
// 通过当前路由解析选择上游，构造摘要请求并返回摘要文本。
func (s *Service) callCompactLLM(ctx context.Context, platformModelName string, messages []model.Message, prompt string) (string, error) {
	if s.routeResolver == nil || s.llmClient == nil {
		return "", errors.New("llm not configured")
	}

	code := platformModelName
	if strings.TrimSpace(code) == "" {
		return "", errors.New("compact model not configured")
	}
	routeCtx, _ := ctx.Value(textTaskRouteContextKey{}).(textTaskRouteContext)

	route, err := s.routeResolver.ResolveRoute(ctx, channel.ResolveRouteInput{
		PlatformModelName: code,
		TaskType:          channel.TaskTypeChat,
		Scope:             channel.RouteScopeInternal,
		UserID:            routeCtx.UserID,
		ConversationID:    routeCtx.ConversationID,
	})
	if err != nil {
		return "", fmt.Errorf("compact route resolve: %w", err)
	}

	// 构建摘要请求：系统提示 + 历史消息（内容截断防止超长）。
	const maxContentRunes = 2000
	llmMsgs := make([]llm.Message, 0, len(messages)+1)
	llmMsgs = append(llmMsgs, llm.Message{Role: "system", Content: prompt})
	for _, m := range messages {
		if m.Role != "user" && m.Role != "assistant" {
			continue
		}
		content := m.Content
		runes := []rune(content)
		if len(runes) > maxContentRunes {
			content = string(runes[:maxContentRunes]) + "...[truncated]"
		}
		llmMsgs = append(llmMsgs, llm.Message{Role: m.Role, Content: content})
	}

	attributionReferer, attributionTitle := s.llmAttribution()
	routeConfig := llm.RouteConfig{
		Protocol:            route.Protocol,
		BaseURL:             route.BaseURL,
		UserConfigured:      route.UserConfigured,
		APIKey:              route.APIKey,
		HeadersJSON:         route.HeadersJSON,
		ConnectTimeoutMS:    route.ConnectTimeoutMS,
		ReadTimeoutMS:       route.ReadTimeoutMS,
		StreamIdleTimeoutMS: route.StreamIdleTimeoutMS,
		Endpoint:            llm.DefaultEndpointForAdapter(route.Protocol),
		UpstreamModel:       route.UpstreamModel,
		AttributionReferer:  attributionReferer,
		AttributionTitle:    attributionTitle,
	}
	generateInput := buildTextTaskGenerateInput(route, s.cfg.Snapshot(), llmMsgs)
	out, err := s.llmClient.Generate(ctx, routeConfig, generateInput)
	if err != nil {
		return "", fmt.Errorf("compact llm generate: %w", err)
	}
	return strings.TrimSpace(out.Text), nil
}

// textTaskRouteContextKey 承载内部文本任务（标题、标签、压缩）的路由上下文。
type textTaskRouteContextKey struct{}

type textTaskRouteContext struct {
	UserID         uint
	ConversationID uint
}

// withTextTaskRouteContext 为内部文本任务附带路由所需的用户与会话信息。
func withTextTaskRouteContext(ctx context.Context, userID uint, conversationID uint) context.Context {
	return context.WithValue(ctx, textTaskRouteContextKey{}, textTaskRouteContext{
		UserID:         userID,
		ConversationID: conversationID,
	})
}
