"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatContentWidth } from "@/entities/user-settings";
import { useSettingsAppearancePersistence } from "@/features/settings/hooks/use-settings-appearance-persistence";
import { useSettingsChat } from "@/features/settings/hooks/use-settings-chat";
import {
  type ChatFontOption,
  type ChatFontWeightOption,
  useChatFontPreference,
  useChatFontWeightPreference,
  writeChatFontPreference,
  writeChatFontWeightPreference,
} from "@/features/settings/utils/chat-font";
import { useFeaturePolicy } from "@/shared/hooks/use-feature-policy";
import {
  ModelSelect,
  type ModelSelectOption,
  parseKindsJSON,
  resolveModelOptionIconUrl,
  resolveModelOptionLabel,
} from "@/entities/model";
import {
  SettingsFieldList,
  SettingsFieldRow,
  SettingsPage,
  SettingsSection,
  SettingsSectionSeparator,
} from "@/shared/components/settings-layout";
import { platformModifierLabel, platformSendShortcut } from "@/shared/lib/platform-shortcuts";
import type { SendShortcut } from "@/features/settings/types/settings";
import { ChatDisplayAppearance } from "./chat-display-appearance";

type ModelOption = ModelSelectOption;

const SYSTEM_RECOMMENDED_MODEL = "none";

// Main component.

export function SettingsChat() {
  const t = useTranslations("settings.chatPage");
  const {
    settings,
    loading,
    billingMode,
    contextCompressionEnabled,
    modelGroups,
    handleBool,
    handleEnum,
    handleDefaultModel,
  } = useSettingsChat();
  const billingEnabled = billingMode !== "self";
  const { processTraceEnabled } = useFeaturePolicy();
  const chatFont = useChatFontPreference();
  const chatFontWeight = useChatFontWeightPreference();
  const persistAppearancePreferences = useSettingsAppearancePersistence();
  const [modifierLabel, setModifierLabel] = React.useState<"Command" | "Ctrl">("Ctrl");
  const [modifierShortcut, setModifierShortcut] = React.useState<Exclude<SendShortcut, "enter">>("ctrl_enter");
  const modelOptions = React.useMemo<ModelOption[]>(
    () => [
      { label: t("defaultModel.systemRecommended"), value: SYSTEM_RECOMMENDED_MODEL, iconUrl: null },
      ...modelGroups.flatMap(([, items]) =>
        items
          .filter((model) => model.platformModelName.trim() && parseKindsJSON(model.kindsJSON).includes("chat"))
          .map((model) => ({
			label: resolveModelOptionLabel(model.platformModelName, model.displayName),
            value: model.platformModelName,
            iconUrl: resolveModelOptionIconUrl({
              platformModelName: model.platformModelName,
              vendor: model.vendor ?? "",
              icon: model.icon ?? "",
            }),
          })),
      ),
    ],
    [modelGroups, t],
  );

  const titleModelOptions = React.useMemo<ModelOption[]>(() => {
    const options = [
      { label: t("defaultModel.titleModelFollow"), value: "follow", iconUrl: null },
      ...modelOptions.filter((option) => option.value !== SYSTEM_RECOMMENDED_MODEL),
    ];
    if (!options.some((option) => option.value === settings.titleModel)) {
      options.push({ label: t("defaultModel.titleModelUnavailable"), value: settings.titleModel, iconUrl: null });
    }
    return options;
  }, [modelOptions, settings.titleModel, t]);

  React.useEffect(() => {
    setModifierLabel(platformModifierLabel());
    setModifierShortcut(platformSendShortcut());
  }, []);

  const sendShortcutLabel = settings.sendShortcut === "enter" ? "Enter" : `${modifierLabel}+Enter`;

  const handleChatFontChange = React.useCallback((value: ChatFontOption) => {
    writeChatFontPreference(value);
    persistAppearancePreferences({ chatFont: value });
  }, [persistAppearancePreferences]);

  const handleChatFontWeightChange = React.useCallback((value: ChatFontWeightOption) => {
    writeChatFontWeightPreference(value);
    persistAppearancePreferences({ chatFontWeight: value });
  }, [persistAppearancePreferences]);

  const handleContentWidthChange = React.useCallback((value: ChatContentWidth) => {
    handleEnum("chat.content_width")(value);
  }, [handleEnum]);

  return (
    <SettingsPage>
      <SettingsSection title={t("defaultModel.sectionTitle")}>
        <SettingsFieldList>
          <SettingsFieldRow
            title={t("defaultModel.title")}
            description={t("defaultModel.description")}
          >
            {loading ? (
              <Skeleton className="h-8 w-full rounded-md" />
            ) : (
              <ModelSelect
                value={settings.defaultModel}
                fallbackValue={SYSTEM_RECOMMENDED_MODEL}
                options={modelOptions}
                contentClassName="min-w-[min(320px,calc(100vw-2rem))]"
                onChange={handleDefaultModel}
                disabled={loading}
              />
            )}
          </SettingsFieldRow>
          <div className="space-y-4 pt-4">
            <SettingsFieldRow
              title={t("defaultModel.autoTitle")}
              description={t("defaultModel.autoTitleDescription")}
            >
              <Switch
                checked={settings.autoGenerateTitle}
                onCheckedChange={handleBool("chat.auto_generate_title")}
                disabled={loading}
                aria-label={t("defaultModel.autoTitle")}
              />
            </SettingsFieldRow>
            {settings.autoGenerateTitle ? (
              <SettingsFieldRow
                title={t("defaultModel.titleModel")}
                description={t("defaultModel.titleModelDescription")}
              >
                <ModelSelect
                  value={settings.titleModel}
                  fallbackValue="follow"
                  options={titleModelOptions}
                  contentClassName="min-w-[min(320px,calc(100vw-2rem))]"
                  onChange={handleEnum("chat.title_model")}
                  disabled={loading}
                />
              </SettingsFieldRow>
            ) : null}
            <SettingsFieldRow
              title={t("defaultModel.autoLabels")}
              description={t("defaultModel.autoLabelsDescription")}
            >
              <Switch
                checked={settings.autoGenerateLabels}
                onCheckedChange={handleBool("chat.auto_generate_labels")}
                disabled={loading}
                aria-label={t("defaultModel.autoLabels")}
              />
            </SettingsFieldRow>
          </div>
        </SettingsFieldList>
      </SettingsSection>

      <SettingsSectionSeparator />

      <SettingsSection title={t("input.sectionTitle")}>
        <SettingsFieldList>
          <SettingsFieldRow
            title={t("input.shortcutTitle")}
            description={t("input.shortcutDescription", { shortcut: sendShortcutLabel })}
          >
            <Select
              value={settings.sendShortcut === "enter" ? "enter" : modifierShortcut}
              onValueChange={handleEnum("chat.send_on_enter")}
              disabled={loading}
            >
              <SelectTrigger size="sm" className="text-left md:text-right *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:justify-start md:*:data-[slot=select-value]:justify-end">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="enter">Enter</SelectItem>
                <SelectItem value={modifierShortcut}>{modifierLabel}+Enter</SelectItem>
              </SelectContent>
            </Select>
          </SettingsFieldRow>
          <div className="pt-4">
            <SettingsFieldRow
              title={t("input.heightTitle")}
              description={t("input.heightDescription")}
            >
              <Select
                value={settings.inputHeight}
                onValueChange={handleEnum("chat.input_height")}
                disabled={loading}
              >
                <SelectTrigger size="sm" className="text-left md:text-right *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:justify-start md:*:data-[slot=select-value]:justify-end">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="compact">{t("input.height.compact")}</SelectItem>
                  <SelectItem value="standard">{t("input.height.standard")}</SelectItem>
                  <SelectItem value="loose">{t("input.height.loose")}</SelectItem>
                </SelectContent>
              </Select>
            </SettingsFieldRow>
          </div>
          <div className="pt-4">
            <SettingsFieldRow
              title={t("input.restoreDraftTitle")}
              description={t("input.restoreDraftDescription")}
            >
              <Switch
                checked={settings.restoreDraftOnFailure}
                onCheckedChange={handleBool("chat.restore_draft_on_failure")}
                disabled={loading}
                aria-label={t("input.restoreDraftTitle")}
              />
            </SettingsFieldRow>
          </div>
          <div className="pt-4">
            <SettingsFieldRow
              title={t("input.preserveDraftTitle")}
              description={t("input.preserveDraftDescription")}
            >
              <Switch
                checked={settings.preserveConversationDrafts}
                onCheckedChange={handleBool("chat.preserve_conversation_drafts")}
                disabled={loading}
                aria-label={t("input.preserveDraftTitle")}
              />
            </SettingsFieldRow>
          </div>
          <div className="pt-4">
            <SettingsFieldRow
              title={t("input.reuseModelOptionsTitle")}
              description={t("input.reuseModelOptionsDescription")}
            >
              <Switch
                checked={settings.reuseModelOptions}
                onCheckedChange={handleBool("chat.reuse_model_options")}
                disabled={loading}
                aria-label={t("input.reuseModelOptionsTitle")}
              />
            </SettingsFieldRow>
          </div>
          <div className="pt-4">
            <SettingsFieldRow
              title={t("input.deleteFilesDefaultTitle")}
              description={t("input.deleteFilesDefaultDescription")}
            >
              <Switch
                checked={settings.deleteFilesByDefault}
                onCheckedChange={handleBool("chat.delete_conversation_files_by_default")}
                disabled={loading}
                aria-label={t("input.deleteFilesDefaultTitle")}
              />
            </SettingsFieldRow>
          </div>
        </SettingsFieldList>
      </SettingsSection>

      <SettingsSectionSeparator />

      <SettingsSection title={t("display.sectionTitle")}>
        <SettingsFieldList>
          <div>
            <SettingsFieldRow
              title={t("display.markdownTitle")}
              description={t("display.markdownDescription")}
            >
              <Switch
                checked={settings.markdownRender}
                onCheckedChange={handleBool("chat.markdown_render")}
                disabled={loading}
                aria-label={t("display.markdownTitle")}
              />
            </SettingsFieldRow>
          </div>

          <div className="pt-4">
            <SettingsFieldRow
              title={t("display.autoExpandThinkingTitle")}
              description={t("display.autoExpandThinkingDescription")}
            >
              <Switch
                checked={settings.autoExpandThinking}
                onCheckedChange={handleBool("chat.auto_expand_thinking")}
                disabled={loading}
                aria-label={t("display.autoExpandThinkingTitle")}
              />
            </SettingsFieldRow>
          </div>

          <div className="pt-4">
            <SettingsFieldRow
              title={t("display.autoExpandToolCallsTitle")}
              description={t("display.autoExpandToolCallsDescription")}
            >
              <Switch
                checked={settings.autoExpandToolCalls}
                onCheckedChange={handleBool("chat.auto_expand_tool_calls")}
                disabled={loading}
                aria-label={t("display.autoExpandToolCallsTitle")}
              />
            </SettingsFieldRow>
          </div>

          {processTraceEnabled ? (
            <div className="pt-4">
              <SettingsFieldRow
                title={t("display.processTraceTitle")}
                description={t("display.processTraceDescription")}
              >
                <Switch
                  checked={settings.showProcessTrace}
                  onCheckedChange={handleBool("chat.show_process_trace")}
                  disabled={loading}
                  aria-label={t("display.processTraceTitle")}
                />
              </SettingsFieldRow>
            </div>
          ) : null}
          <div className="pt-4">
            <SettingsFieldRow
              title={t("display.modelTitle")}
              description={t("display.modelDescription")}
            >
              <Switch
                checked={settings.showModelInfo}
                onCheckedChange={handleBool("chat.show_model_info")}
                disabled={loading}
                aria-label={t("display.modelTitle")}
              />
            </SettingsFieldRow>
          </div>

          <div className="pt-4">
            <SettingsFieldRow
              title={t("display.tokenTitle")}
              description={t("display.tokenDescription")}
            >
              <Switch
                checked={settings.showTokenUsage}
                onCheckedChange={handleBool("chat.show_token_usage")}
                disabled={loading}
                aria-label={t("display.tokenTitle")}
              />
            </SettingsFieldRow>
          </div>

          <div className="pt-4">
            <SettingsFieldRow
              title={t("display.latencyTitle")}
              description={t("display.latencyDescription")}
            >
              <Switch
                checked={settings.showLatency}
                onCheckedChange={handleBool("chat.show_latency")}
                disabled={loading}
                aria-label={t("display.latencyTitle")}
              />
            </SettingsFieldRow>
          </div>

          <div className="pt-4">
            <SettingsFieldRow
              title={t("display.costTitle")}
              description={t("display.costDescription")}
            >
              <Switch
                checked={billingEnabled && settings.showBillingCost}
                onCheckedChange={handleBool("chat.show_billing_cost")}
                disabled={loading || !billingEnabled}
                aria-label={t("display.costTitle")}
              />
            </SettingsFieldRow>
          </div>


          <div className="pt-4">
            <ChatDisplayAppearance
              contentWidth={settings.contentWidth}
              chatFont={chatFont}
              chatFontWeight={chatFontWeight}
              onContentWidthChange={handleContentWidthChange}
              onChatFontChange={handleChatFontChange}
              onChatFontWeightChange={handleChatFontWeightChange}
              disabled={loading}
            />
          </div>
        </SettingsFieldList>
      </SettingsSection>

      <SettingsSectionSeparator />

      <SettingsSection title={t("context.sectionTitle")}>
        <SettingsFieldList>
          {contextCompressionEnabled ? (
            <SettingsFieldRow
              title={t("context.autoCompactTitle")}
              description={t("context.autoCompactDescription")}
            >
              <Switch
                checked={settings.contextCompactAuto}
                onCheckedChange={handleBool("chat.context_compact_auto")}
                disabled={loading}
                aria-label={t("context.autoCompactTitle")}
              />
            </SettingsFieldRow>
          ) : null}
          <div className={contextCompressionEnabled ? "pt-4" : undefined}>
            <SettingsFieldRow
              title={t("context.reasoningPassbackTitle")}
              description={t("context.reasoningPassbackDescription")}
            >
              <Switch
                checked={settings.reasoningContentPassback}
                onCheckedChange={handleBool("chat.reasoning_content_passback")}
                disabled={loading}
                aria-label={t("context.reasoningPassbackTitle")}
              />
            </SettingsFieldRow>
          </div>
        </SettingsFieldList>
      </SettingsSection>

      <SettingsSectionSeparator />

      <SettingsSection title={t("file.sectionTitle")}>
        <SettingsFieldList>
          <SettingsFieldRow
            title={t("file.modeTitle")}
            description={
              settings.fileMode === "auto"
                ? t("file.modeDescription.auto")
                : settings.fileMode === "full_context"
                  ? t("file.modeDescription.fullContext")
                  : t("file.modeDescription.rag")
            }
          >
            <Select
              value={settings.fileMode}
              onValueChange={handleEnum("chat.file_mode")}
              disabled={loading}
            >
              <SelectTrigger size="sm" className="text-left md:text-right *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:justify-start md:*:data-[slot=select-value]:justify-end">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="auto">{t("file.mode.auto")}</SelectItem>
                <SelectItem value="full_context">{t("file.mode.fullContext")}</SelectItem>
                <SelectItem value="rag">{t("file.mode.rag")}</SelectItem>
              </SelectContent>
            </Select>
          </SettingsFieldRow>
        </SettingsFieldList>
      </SettingsSection>

    </SettingsPage>
  );
}
