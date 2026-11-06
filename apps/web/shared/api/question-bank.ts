import type { QuestionBankResponse, QuestionBankItemResponse, QuestionBankPartResponse } from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";

export type QuestionBankData = QuestionBankResponse;
export type QuestionBankItem = QuestionBankItemResponse;
export type QuestionBankPart = QuestionBankPartResponse;

export function getQuestionBank(accessToken: string, filters: { category: string; query: string; page: number; locale: string }, signal?: AbortSignal): Promise<QuestionBankData> {
  const query = new URLSearchParams({ category: filters.category, q: filters.query, page: String(filters.page), pageSize: "20", locale: filters.locale });
  return authedRequest<QuestionBankData>(`/api/v1/learning/question-bank?${query}`, { accessToken, signal });
}
