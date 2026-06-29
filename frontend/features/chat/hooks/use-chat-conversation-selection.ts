"use client";

import * as React from "react";

import { listConversationRuns } from "@/shared/api/conversation";
import { resolveAccessToken } from "@/shared/auth/resolve-access-token";

// Number of most-recent runs to scan when restoring a conversation's selection.
// Media-generation runs carry no skill/tool selection, so we look past them for
// the latest chat run, mirroring how the model is restored from run history.
const CONVERSATION_RUN_SCAN_SIZE = 10;

export type ConversationRunSelection = {
  conversationKey: string;
  skillIDs: number[];
  selectedToolIDs: number[];
};

// useChatConversationSelection resolves the skill/tool selection a conversation
// last ran with, so switching conversations restores each one's own selection
// instead of carrying the previous conversation's chips over. It mirrors the
// model restore in useChatModelOptions: read the latest run from history.
//
// For an existing conversation it reports that conversation's selection, and an
// empty selection when it has no chat run yet, so a genuine switch clears stale
// chips instead of leaving the previous conversation's selection visible. The
// just-created-conversation case (where the user picked skills before the first
// send) is preserved by the manual-selection guards in the consumer.
export function useChatConversationSelection({
  conversationID,
  resetToken = 0,
}: {
  conversationID: string | null;
  resetToken?: number;
}): ConversationRunSelection | null {
  const [selection, setSelection] = React.useState<ConversationRunSelection | null>(null);
  const requestRef = React.useRef(0);

  React.useEffect(() => {
    const conversationKey = conversationID?.trim() || "";
    const requestID = requestRef.current + 1;
    requestRef.current = requestID;

    if (!conversationKey) {
      setSelection(null);
      return;
    }

    let cancelled = false;
    async function loadSelection() {
      const token = await resolveAccessToken();
      if (!token || cancelled || requestID !== requestRef.current) {
        return;
      }
      const runs = await listConversationRuns(token, conversationKey, {
        page: 1,
        pageSize: CONVERSATION_RUN_SCAN_SIZE,
      });
      if (cancelled || requestID !== requestRef.current) {
        return;
      }
      const latestChatRun = runs.results.find((run) => run.taskType === "chat");
      setSelection({
        conversationKey,
        skillIDs: latestChatRun?.skillIDs ?? [],
        selectedToolIDs: latestChatRun?.selectedToolIDs ?? [],
      });
    }

    void loadSelection().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [conversationID, resetToken]);

  return selection;
}
