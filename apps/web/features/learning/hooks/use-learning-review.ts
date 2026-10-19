"use client";

import * as React from "react";
import { useLocale } from "next-intl";

import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { getLearningVariant, saveLearningReview } from "@/shared/api/learning";
import type { LearningAttemptResult, LearningReviewPayload, LearningVariantData } from "@/shared/api/learning-types";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { createSecureUUID } from "@/shared/lib/secure-id";

export function useLearningReview(variantId: string, onSaved: () => void) {
  const { accessToken } = useAuthSession();
  const locale = useLocale();
  const resolveError = useLocalizedErrorMessage();
  const [snapshot, setSnapshot] = React.useState<{ token: string; data: LearningVariantData } | null>(null);
  const [result, setResult] = React.useState<LearningAttemptResult | null>(null);
  const [selected, setSelected] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [locked, setLocked] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loadRevision, setLoadRevision] = React.useState(0);
  const payload = React.useRef<LearningReviewPayload | null>(null);
  const owner = React.useRef(accessToken);
  const inFlight = React.useRef(false);
  const data = snapshot?.token === accessToken ? snapshot.data : null;

  React.useEffect(() => {
    owner.current = accessToken;
    const controller = new AbortController();
    setSnapshot(null); setResult(null); setSelected(null); setLoading(true); setError(""); setSaving(false); setLocked(false);
    payload.current = null; inFlight.current = false;
    void getLearningVariant(accessToken, variantId, locale, controller.signal).then((value) => {
      if (!controller.signal.aborted) setSnapshot({ token: accessToken, data: value });
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(resolveError(cause));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); owner.current = ""; };
  }, [accessToken, variantId, locale, loadRevision, resolveError]);

  async function submit() {
    if (!data || selected === null || result || inFlight.current) return;
    // Preserve the UUID and answer after an interrupted request. Reviews never
    // enter the quick-quiz retry buffer, whose payload has different semantics.
    const input = payload.current ?? { id: createSecureUUID(), baseQuestionId: data.baseQuestionId, variantId, selected, locale };
    payload.current = input;
    setLocked(true);
    inFlight.current = true; setSaving(true); setError("");
    const token = accessToken;
    try {
      const saved = await saveLearningReview(token, input);
      if (owner.current === token) { setResult(saved); onSaved(); }
    } catch (cause: unknown) {
      if (owner.current === token) setError(resolveError(cause));
    } finally {
      if (owner.current === token) { setSaving(false); inFlight.current = false; }
    }
  }

  return { data, result: data ? result : null, selected, setSelected, loading, saving, error, locked, submit, reload: () => setLoadRevision((value) => value + 1) };
}
