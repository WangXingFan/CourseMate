export const DEFAULT_AUTH_NEXT_PATH = "/dashboard";

export function normalizeAuthNextPath(value: string | null | undefined, fallback = DEFAULT_AUTH_NEXT_PATH): string {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
