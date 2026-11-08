import { resolveApiBaseURL } from "@/shared/api/http-client";
import { isRecord } from "@/shared/lib/type-guards";

export type LearningHandoff = { prompt: string; returnHref: string; title: string };
const key = (owner: string, id: string) => `coursemate.learning-help:${JSON.stringify([resolveApiBaseURL(), owner, id])}`;

export function saveLearningHandoff(owner: string, id: string, value: LearningHandoff) {
  sessionStorage.setItem(key(owner, id), JSON.stringify(value));
}
export function takeLearningHandoff(owner: string, id: string): LearningHandoff | null {
  const storageKey = key(owner, id);
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value) || typeof value.prompt !== "string" || typeof value.title !== "string" || typeof value.returnHref !== "string" || !value.returnHref.startsWith("/learn/")) return null;
  sessionStorage.removeItem(storageKey);
  return { prompt: value.prompt, title: value.title, returnHref: value.returnHref };
}
