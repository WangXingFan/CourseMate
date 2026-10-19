import type { LearningAttemptPayload } from "@/shared/api/learning-types";

export function parsePendingAttempts(raw: string | null): LearningAttemptPayload[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is LearningAttemptPayload => {
      if (!item || typeof item !== "object") return false;
      if ((item.mode !== undefined && item.mode !== "quiz") || item.variantId !== undefined || item.baseQuestionId !== undefined) return false;
      return typeof item.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
        && typeof item.questionId === "string" && item.questionId.length <= 64
        && Number.isInteger(item.selected) && item.selected >= 0 && item.selected <= 3;
    }).slice(0, 200);
  } catch {
    return [];
  }
}
