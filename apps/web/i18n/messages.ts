import type { AppLocale } from "@/i18n/config";
import enAdminFiles from "@/i18n/messages/en-US/admin-files.json";
import enAdminModels from "@/i18n/messages/en-US/admin-models.json";
import enAdminUpstreams from "@/i18n/messages/en-US/admin-upstreams.json";
import enAdminUsers from "@/i18n/messages/en-US/admin-users.json";
import enDesktopSetup from "@/i18n/messages/en-US/desktop-setup.json";
import enDesktopTabs from "@/i18n/messages/en-US/desktop-tabs.json";
import enDesktopUpdate from "@/i18n/messages/en-US/desktop-update.json";
import enChat from "@/i18n/messages/en-US/chat.json";
import enClassrooms from "@/i18n/messages/en-US/classrooms.json";
import enCommon from "@/i18n/messages/en-US/common.json";
import enConversation from "@/i18n/messages/en-US/conversation.json";
import enErrors from "@/i18n/messages/en-US/errors.json";
import enGuide from "@/i18n/messages/en-US/guide.json";
import enKnowledgeBases from "@/i18n/messages/en-US/knowledge-bases.json";
import enLearning from "@/i18n/messages/en-US/learning.json";
import enLearningLabs from "@/i18n/messages/en-US/learning-labs.json";
import enLogin from "@/i18n/messages/en-US/login.json";
import enRecent from "@/i18n/messages/en-US/recent.json";
import enSettings from "@/i18n/messages/en-US/settings.json";
import { replaceDefaultBrandTitle } from "@/shared/config/branding";

const ENGLISH_MESSAGES = {
  common: enCommon,
  conversation: enConversation,
  errors: enErrors,
  login: enLogin,
  guide: enGuide,
  chat: enChat,
  classrooms: enClassrooms,
  desktopSetup: enDesktopSetup,
  desktopTabs: enDesktopTabs,
  desktopUpdate: enDesktopUpdate,
  recent: enRecent,
  knowledgeBases: enKnowledgeBases,
  learning: enLearning,
  learningLabs: enLearningLabs,
  settings: enSettings,
  adminFiles: enAdminFiles,
  adminModels: enAdminModels,
  adminUpstreams: enAdminUpstreams,
  adminUsers: enAdminUsers,
};

export type AppMessages = typeof ENGLISH_MESSAGES;

export function applyBrandingToMessages(messages: AppMessages, brandTitle: string): AppMessages {
  return {
    ...messages,
    guide: {
      ...messages.guide,
      userWelcomeTitle: replaceDefaultBrandTitle(messages.guide.userWelcomeTitle, brandTitle),
    },
    recent: {
      ...messages.recent,
      allConversationsDescription: replaceDefaultBrandTitle(messages.recent.allConversationsDescription, brandTitle),
    },
    login: {
      ...messages.login,
      title: replaceDefaultBrandTitle(messages.login.title, brandTitle),
    },
    chat: {
      ...messages.chat,
      placeholder: replaceDefaultBrandTitle(messages.chat.placeholder, brandTitle),
    },
    settings: {
      ...messages.settings,
      accountPage: {
        ...messages.settings.accountPage,
        securityDialog: {
          ...messages.settings.accountPage.securityDialog,
          email: {
            ...messages.settings.accountPage.securityDialog.email,
            description: {
              ...messages.settings.accountPage.securityDialog.email.description,
              change: replaceDefaultBrandTitle(
                messages.settings.accountPage.securityDialog.email.description.change,
                brandTitle,
              ),
            },
          },
        },
      },
    },
  };
}

export const DEFAULT_MESSAGES: AppMessages = ENGLISH_MESSAGES;

export async function loadLocaleMessages(locale: AppLocale): Promise<AppMessages> {
  if (locale === "en-US") {
    return DEFAULT_MESSAGES;
  }

  const [
    desktopSetup,
    desktopTabs,
    desktopUpdate,
    common,
    conversation,
    errors,
    login,
    guide,
    chat,
    classrooms,
    recent,
    knowledgeBases,
    learning,
    learningLabs,
    settings,
    adminFiles,
    adminModels,
    adminUpstreams,
    adminUsers,
  ] = await Promise.all([
    import("@/i18n/messages/zh-CN/desktop-setup.json"),
    import("@/i18n/messages/zh-CN/desktop-tabs.json"),
    import("@/i18n/messages/zh-CN/desktop-update.json"),
    import("@/i18n/messages/zh-CN/common.json"),
    import("@/i18n/messages/zh-CN/conversation.json"),
    import("@/i18n/messages/zh-CN/errors.json"),
    import("@/i18n/messages/zh-CN/login.json"),
    import("@/i18n/messages/zh-CN/guide.json"),
    import("@/i18n/messages/zh-CN/chat.json"),
    import("@/i18n/messages/zh-CN/classrooms.json"),
    import("@/i18n/messages/zh-CN/recent.json"),
    import("@/i18n/messages/zh-CN/knowledge-bases.json"),
    import("@/i18n/messages/zh-CN/learning.json"),
    import("@/i18n/messages/zh-CN/learning-labs.json"),
    import("@/i18n/messages/zh-CN/settings.json"),
    import("@/i18n/messages/zh-CN/admin-files.json"),
    import("@/i18n/messages/zh-CN/admin-models.json"),
    import("@/i18n/messages/zh-CN/admin-upstreams.json"),
    import("@/i18n/messages/zh-CN/admin-users.json"),
  ]);

  return {
    desktopSetup: desktopSetup.default,
    desktopTabs: desktopTabs.default,
    desktopUpdate: desktopUpdate.default,
    common: common.default,
    conversation: conversation.default,
    errors: errors.default,
    login: login.default,
    guide: guide.default,
    chat: chat.default,
    classrooms: classrooms.default,
    recent: recent.default,
    knowledgeBases: knowledgeBases.default,
    learning: learning.default,
    learningLabs: learningLabs.default,
    settings: settings.default,
    adminFiles: adminFiles.default,
    adminModels: adminModels.default,
    adminUpstreams: adminUpstreams.default,
    adminUsers: adminUsers.default,
  };
}
