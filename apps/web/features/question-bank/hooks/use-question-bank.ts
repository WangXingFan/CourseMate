"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { getQuestionBank, type QuestionBankData } from "@/shared/api/question-bank";

export function useQuestionBank(accessToken: string) {
  const locale = useLocale();
  const resolveError = useLocalizedErrorMessage();
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; owner: string; data: QuestionBankData | null; error: string } | null>(null);
  const owner = JSON.stringify([accessToken, locale]);
  const key = JSON.stringify([owner, category, query, page, revision]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void getQuestionBank(accessToken, { category, query, page, locale }, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setResult({ key, owner, data, error: "" }); })
        .catch((cause: unknown) => { if (!controller.signal.aborted) setResult({ key, owner, data: null, error: resolveError(cause) }); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [accessToken, category, query, page, locale, key, owner, resolveError]);

  const current = result?.key === key ? result : null;
  return {
    data: current?.data ?? null,
    categories: result?.owner === owner ? result.data?.categories ?? [] : [],
    loading: current === null,
    error: current?.error ?? "",
    category, query, page,
    selectCategory(value: string) { setCategory(value); setPage(1); },
    search(value: string) { setQuery(value); setPage(1); },
    setPage,
    retry() { setRevision((value) => value+1); },
  };
}
