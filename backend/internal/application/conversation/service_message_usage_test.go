package conversation

import (
	"strings"
	"testing"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/ports/llm"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/tokenestimate"
)

func TestMessageUsageAccumulatorCombinesObservedAndUnobservedInput(t *testing.T) {
	accumulator := &messageUsageAccumulator{}

	firstCallMessages := []llm.Message{{Role: "user", Content: "hello"}}
	accumulator.beginCall(estimateGenerateInputTokens(llm.GenerateInput{Messages: firstCallMessages}))
	accumulator.addObservedUsage(llm.Usage{InputTokens: 12, OutputTokens: 3})

	if got := accumulator.interruptedInputTokens(); got != 12 {
		t.Fatalf("expected observed input tokens after first call, got %d", got)
	}

	secondCallMessages := []llm.Message{{Role: "tool", Content: "tool result"}}
	secondCallInput := llm.GenerateInput{Messages: secondCallMessages}
	secondCallEstimate := estimateGenerateInputTokens(secondCallInput)
	accumulator.beginCall(secondCallEstimate)
	accumulator.finishCall(false, true)

	want := int64(12) + secondCallEstimate
	if got := accumulator.interruptedInputTokens(); got != want {
		t.Fatalf("expected observed plus unobserved input tokens, got %d want %d", got, want)
	}
	if got := accumulator.effectiveInputTokens(0); got != want {
		t.Fatalf("expected effective input tokens to include unobserved estimate, got %d want %d", got, want)
	}
}

func TestMessageUsageAccumulatorKeepsFullyCachedInputObserved(t *testing.T) {
	input := llm.GenerateInput{Messages: []llm.Message{
		{Role: "system", Content: strings.Repeat("long system prompt ", 400)},
		{Role: "user", Content: "hi"},
	}}
	if estimateGenerateInputTokens(input) <= 0 {
		t.Fatal("expected a positive prompt estimate for the regression input")
	}
	fullyCached := llm.Usage{CacheReadTokens: 3355, OutputTokens: 23, ReasoningTokens: 49}
	const promptFallback = int64(4068)

	tests := map[string]func(accumulator *messageUsageAccumulator){
		"streaming": func(accumulator *messageUsageAccumulator) {
			accumulator.beginCall(estimateGenerateInputTokens(input))
			accumulator.addObservedUsage(fullyCached)
			accumulator.finishCall(fullyCached.HasObservedInput(), fullyCached.HasObservedOutput())
		},
		"non-streaming": func(accumulator *messageUsageAccumulator) {
			accumulator.beginCall(estimateGenerateInputTokens(input))
			accumulator.finishCall(fullyCached.HasObservedInput(), fullyCached.HasObservedOutput())
			accumulator.setObservedUsage(fullyCached)
		},
	}
	for name, run := range tests {
		t.Run(name, func(t *testing.T) {
			accumulator := &messageUsageAccumulator{}
			run(accumulator)

			if got := accumulator.effectiveInputTokens(promptFallback); got != 0 {
				t.Fatalf("expected fully cached prompt to bill zero non-cached input, got %d", got)
			}
			if got := accumulator.interruptedInputTokens(); got != 0 {
				t.Fatalf("expected no estimated input once upstream reported cached input, got %d", got)
			}
			if got := accumulator.usage().CacheReadTokens; got != fullyCached.CacheReadTokens {
				t.Fatalf("expected cache read tokens to be preserved, got %d", got)
			}
		})
	}
}

func TestMessageUsageAccumulatorFallsBackToEstimateWithoutObservedInput(t *testing.T) {
	input := llm.GenerateInput{Messages: []llm.Message{{Role: "user", Content: "hello"}}}
	accumulator := &messageUsageAccumulator{}

	if got := accumulator.effectiveInputTokens(4068); got != 4068 {
		t.Fatalf("expected prompt fallback before any call, got %d", got)
	}

	accumulator.beginCall(estimateGenerateInputTokens(input))
	accumulator.addObservedUsage(llm.Usage{OutputTokens: 5})
	accumulator.finishCall(false, true)

	want := estimateGenerateInputTokens(input)
	if got := accumulator.effectiveInputTokens(4068); got != want {
		t.Fatalf("expected output-only usage to keep the call estimate, got %d want %d", got, want)
	}
	if got := accumulator.interruptedInputTokens(); got != want {
		t.Fatalf("expected interrupted input to include the unobserved estimate, got %d want %d", got, want)
	}
}

func TestEstimateBillableInputTokensUsesFullContextForStatefulCalls(t *testing.T) {
	fullMessages := []llm.Message{
		{Role: "system", Content: strings.Repeat("policy ", 200)},
		{Role: "user", Content: strings.Repeat("earlier question ", 200)},
		{Role: "assistant", Content: strings.Repeat("earlier answer ", 200)},
		{Role: "user", Content: "what about now?"},
	}
	tools := []llm.ToolDefinition{{
		Name:        "lookup",
		Description: "Search docs",
		InputSchema: []byte(`{"type":"object"}`),
	}}
	fullInput := llm.GenerateInput{Messages: fullMessages, Tools: tools}
	fullEstimate := estimateGenerateInputTokens(fullInput)

	statefulInput := llm.GenerateInput{
		Messages:           fullMessages[len(fullMessages)-1:],
		Tools:              tools,
		PreviousResponseID: "resp_previous",
	}
	if got := estimateBillableInputTokens(statefulInput, fullMessages); got != fullEstimate {
		t.Fatalf("expected stateful continuation to be estimated on the full context, got %d want %d", got, fullEstimate)
	}

	toolFollowUp := llm.GenerateInput{
		Messages:           []llm.Message{{Role: "tool", ToolResults: []llm.ToolResult{{ToolCallID: "call_1", ToolName: "lookup", OutputJSON: "{}"}}}},
		Tools:              tools,
		PreviousResponseID: "resp_tool_round",
	}
	followUpHistory := append(append([]llm.Message(nil), fullMessages...),
		llm.Message{Role: "assistant", ToolCalls: []llm.ToolCall{{ToolCallID: "call_1", ToolName: "lookup", ArgumentsJSON: "{}"}}},
		toolFollowUp.Messages[0],
	)
	if got := estimateBillableInputTokens(toolFollowUp, followUpHistory); got <= fullEstimate {
		t.Fatalf("expected stateful tool follow-up to cover the whole history plus the tool round, got %d <= %d", got, fullEstimate)
	}

	if got := estimateBillableInputTokens(fullInput, nil); got != fullEstimate {
		t.Fatalf("expected non-stateful calls to be estimated on the sent request, got %d want %d", got, fullEstimate)
	}
}

func TestResolveObservedOrHigherEstimatedTokensKeepsLargerEstimate(t *testing.T) {
	if got := resolveObservedOrHigherEstimatedTokens(40, 96); got != 96 {
		t.Fatalf("expected larger input estimate, got %d", got)
	}
	if got, _ := estimateOutputUsage(2, 0, "hello world this is a longer streamed response", ""); got <= 2 {
		t.Fatalf("expected output estimate to cover partial observed usage, got %d", got)
	}
}

// 中断时输出侧只补齐“最后一次上报之后”的尾段：工具循环里已完成的调用以上报值为准，
// 被中断的当前调用才按其尾段文本预估。否则用整条消息全文预估会把已观测的输出再算一遍。
func TestMessageUsageAccumulatorInterruptedOutputOnlyEstimatesCurrentCallTail(t *testing.T) {
	accumulator := &messageUsageAccumulator{}

	accumulator.beginCall(100)
	accumulator.recordCallVisibleText("first call visible answer that was fully reported by upstream")
	accumulator.recordCallReasoningText("first call reasoning that was fully reported by upstream")
	accumulator.addObservedUsage(llm.Usage{InputTokens: 100, OutputTokens: 5, ReasoningTokens: 3})
	accumulator.finishCall(true, true)

	tailText := strings.Repeat("streamed tail before interruption ", 20)
	tailReasoning := strings.Repeat("streamed reasoning before interruption ", 20)
	accumulator.beginCall(120)
	accumulator.recordCallVisibleText(tailText)
	accumulator.recordCallReasoningText(tailReasoning)

	gotOutput, gotReasoning := accumulator.interruptedOutputTokens()
	wantOutput := int64(5) + tokenestimate.Estimate(tailText)
	wantReasoning := int64(3) + tokenestimate.Estimate(tailReasoning)
	if gotOutput != wantOutput || gotReasoning != wantReasoning {
		t.Fatalf("interruptedOutputTokens() = (%d, %d), want (%d, %d)", gotOutput, gotReasoning, wantOutput, wantReasoning)
	}

	// 当前调用中途只上报了合并输出（未拆分思考）时，尾段思考并入输出预估且不与上报值叠加：
	// 总量不变，已完成调用的观测值原样保留。
	accumulator.addObservedUsage(llm.Usage{OutputTokens: 1})
	gotOutput, gotReasoning = accumulator.interruptedOutputTokens()
	if gotOutput != 5+tokenestimate.Estimate(tailText)+tokenestimate.Estimate(tailReasoning) || gotReasoning != 3 {
		t.Fatalf("partial combined output must fold the tail reasoning without stacking, got (%d, %d)", gotOutput, gotReasoning)
	}

	// 当前调用上报的输出已经覆盖尾段时以上报值为准。
	accumulator.addObservedUsage(llm.Usage{OutputTokens: 10_000, ReasoningTokens: 10_000})
	gotOutput, gotReasoning = accumulator.interruptedOutputTokens()
	if gotOutput != 5+1+10_000 || gotReasoning != 3+10_000 {
		t.Fatalf("observed output covering the tail must win, got (%d, %d)", gotOutput, gotReasoning)
	}
}

// 未上报输出用量的已完成调用按其文本预估计入，成功与中断路径口径一致。
func TestMessageUsageAccumulatorEstimatesUnobservedCompletedOutput(t *testing.T) {
	accumulator := &messageUsageAccumulator{}

	firstText := strings.Repeat("unreported first call ", 30)
	accumulator.beginCall(50)
	accumulator.recordCallVisibleText(firstText)
	accumulator.finishCall(false, false)

	accumulator.beginCall(60)
	accumulator.recordCallVisibleText("reported second call")
	accumulator.addObservedUsage(llm.Usage{InputTokens: 60, OutputTokens: 4})
	accumulator.finishCall(true, true)

	wantOutput := tokenestimate.Estimate(firstText) + 4
	if gotOutput, gotReasoning := accumulator.effectiveOutputTokens(); gotOutput != wantOutput || gotReasoning != 0 {
		t.Fatalf("effectiveOutputTokens() = (%d, %d), want (%d, 0)", gotOutput, gotReasoning, wantOutput)
	}
	if gotOutput, gotReasoning := accumulator.interruptedOutputTokens(); gotOutput != wantOutput || gotReasoning != 0 {
		t.Fatalf("interruptedOutputTokens() = (%d, %d), want (%d, 0)", gotOutput, gotReasoning, wantOutput)
	}
}

func TestEstimateOutputUsageFoldsReasoningIntoCombinedObservedOutput(t *testing.T) {
	visible := strings.Repeat("visible ", 40)
	reasoning := strings.Repeat("thinking ", 40)

	gotOutput, gotReasoning := estimateOutputUsage(2, 0, visible, reasoning)
	if gotOutput != tokenestimate.Estimate(visible)+tokenestimate.Estimate(reasoning) || gotReasoning != 0 {
		t.Fatalf("combined observed output must fold reasoning into the output estimate, got (%d, %d)", gotOutput, gotReasoning)
	}

	gotOutput, gotReasoning = estimateOutputUsage(2, 1, visible, reasoning)
	if gotOutput != tokenestimate.Estimate(visible) || gotReasoning != tokenestimate.Estimate(reasoning) {
		t.Fatalf("split observed usage must estimate both sides separately, got (%d, %d)", gotOutput, gotReasoning)
	}

	gotOutput, gotReasoning = estimateOutputUsage(0, 0, visible, reasoning)
	if gotOutput != tokenestimate.Estimate(visible) || gotReasoning != tokenestimate.Estimate(reasoning) {
		t.Fatalf("unreported usage must estimate both sides from text, got (%d, %d)", gotOutput, gotReasoning)
	}
}

func TestEstimateGenerateInputTokensIncludesInstructionsAndTools(t *testing.T) {
	input := llm.GenerateInput{
		Messages:     []llm.Message{{Role: "user", Content: "hello"}},
		Instructions: "answer tersely",
		Tools: []llm.ToolDefinition{{
			Name:        "lookup",
			Description: "Search docs",
			InputSchema: []byte(`{"type":"object","properties":{"query":{"type":"string"}}}`),
		}},
	}

	messageOnly := estimatePromptTokens(input.Messages)
	withInputShape := estimateGenerateInputTokens(input)
	if withInputShape <= messageOnly {
		t.Fatalf("expected generate input estimate to include instructions and tools, got %d <= %d", withInputShape, messageOnly)
	}

	input.DisableTools = true
	withoutTools := estimateGenerateInputTokens(input)
	if withoutTools >= withInputShape {
		t.Fatalf("expected disabled tools to be excluded from estimate, got %d >= %d", withoutTools, withInputShape)
	}
}

func TestEstimateGenerateInputTokensIncludesToolCallsAndResults(t *testing.T) {
	withoutTools := estimatePromptTokens([]llm.Message{{Role: "assistant"}})
	withTools := estimatePromptTokens([]llm.Message{
		{
			Role: "assistant",
			ToolCalls: []llm.ToolCall{{
				ToolCallID:    "call_1",
				ToolName:      "fetch_transcript",
				ArgumentsJSON: `{"url":"https://example.com/video"}`,
			}},
		},
		{
			Role: "tool",
			ToolResults: []llm.ToolResult{{
				ToolCallID: "call_1",
				ToolName:   "fetch_transcript",
				OutputJSON: strings.Repeat("subtitle ", 100),
			}},
		},
	})
	if withTools <= withoutTools {
		t.Fatalf("expected tool calls and results to increase prompt estimate, got %d <= %d", withTools, withoutTools)
	}
}

func TestMaxPromptTokenEstimateKeepsFullContextForStatefulContinuation(t *testing.T) {
	fullContext := int64(96_000)
	statefulDelta := int64(1_200)

	if got := maxPromptTokenEstimate(statefulDelta, fullContext); got != fullContext {
		t.Fatalf("expected full context estimate to win over stateful delta, got %d", got)
	}
}

func TestFitGenerateInputToModelBudgetTrimsWholeOldestTurnsAfterFinalAssembly(t *testing.T) {
	input := llm.GenerateInput{
		Messages: []llm.Message{
			{Role: "system", Content: "stable files and policy"},
			{Role: "user", Content: strings.Repeat("old question ", 5_000)},
			{Role: "assistant", Content: strings.Repeat("old answer ", 5_000)},
			{Role: "user", Content: "recent question"},
			{Role: "assistant", Content: "recent answer"},
			{Role: "user", Content: "current question"},
		},
		Instructions: "native provider instructions",
		Tools: []llm.ToolDefinition{{
			Name:        "search_docs",
			Description: "Search the configured knowledge sources",
			InputSchema: []byte(`{"type":"object","properties":{"query":{"type":"string"}}}`),
		}},
	}
	capabilities := `{"contextWindow":32000,"maxOutputTokens":4000}`

	fitted, fit := fitGenerateInputToModelBudget(input, "custom-model", capabilities, 128_000, true)

	if !fit.Trimmed || fit.Exceeded {
		t.Fatalf("expected prompt to be trimmed within budget, got %#v", fit)
	}
	if fit.TokensAfter > fit.Budget {
		t.Fatalf("expected final request shape within budget, got %d > %d", fit.TokensAfter, fit.Budget)
	}
	if len(fitted.Messages) != 4 {
		t.Fatalf("expected the oldest complete turn to be removed, got %#v", fitted.Messages)
	}
	if fitted.Messages[0].Role != "system" || fitted.Messages[1].Content != "recent question" || fitted.Messages[3].Content != "current question" {
		t.Fatalf("expected system prefix and complete recent/current turns, got %#v", fitted.Messages)
	}
	if fitted.Instructions != input.Instructions || len(fitted.Tools) != 1 {
		t.Fatalf("expected fixed request content to remain intact, got %#v", fitted)
	}
}

func TestFitGenerateInputToModelBudgetReportsRequiredContentOverflow(t *testing.T) {
	input := llm.GenerateInput{Messages: []llm.Message{
		{Role: "system", Content: strings.Repeat("required policy ", 5_000)},
		{Role: "user", Content: strings.Repeat("current input ", 5_000)},
	}}

	fitted, fit := fitGenerateInputToModelBudget(
		input,
		"custom-model",
		`{"contextWindow":4096,"maxOutputTokens":1}`,
		128_000,
		true,
	)

	if fit.Trimmed || !fit.Exceeded {
		t.Fatalf("expected required-only overflow without destructive trimming, got %#v", fit)
	}
	if len(fitted.Messages) != len(input.Messages) {
		t.Fatalf("expected required messages to remain intact, got %#v", fitted.Messages)
	}
}

func TestFitGenerateInputToModelBudgetCanBeDisabled(t *testing.T) {
	input := llm.GenerateInput{Messages: []llm.Message{
		{Role: "user", Content: strings.Repeat("history ", 10_000)},
		{Role: "assistant", Content: strings.Repeat("answer ", 10_000)},
		{Role: "user", Content: "current"},
	}}

	fitted, fit := fitGenerateInputToModelBudget(input, "custom-model", `{"contextWindow":4096}`, 128_000, false)

	if fit.Trimmed || fit.Exceeded || fit.Budget != 0 || len(fitted.Messages) != len(input.Messages) {
		t.Fatalf("expected disabled budget fitting to preserve input, got %#v %#v", fit, fitted.Messages)
	}
}
