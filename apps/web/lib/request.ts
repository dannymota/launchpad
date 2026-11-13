// Shared by the Worker and the pages. No framework imports, so both sides can use it.

/** The request's origin, set by the Worker on every request it hands to a page. A copy sent by a client is replaced. */
export const ORIGIN_HEADER = "x-app-origin";

/**
 * A path on this site to continue to after sign-in, or `fallback`. Rejects anything that
 * a browser could read as another site: "//host", "/\host", control characters.
 */
export function safePath(value: string | null | undefined, fallback: string): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  for (const char of value) {
    if (char === "\\" || char.charCodeAt(0) < 0x20) return fallback;
  }
  return value;
}
