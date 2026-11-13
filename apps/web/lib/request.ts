// Safe in the browser and on the server: no framework or backend imports.

/**
 * A path on this site to continue to after sign-in, or `fallback`. Rejects anything that
 * a browser could read as another site: "//host", "/\\host", control characters.
 */
export function safePath(value: string | null | undefined, fallback: string): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  for (const char of value) {
    if (char === "\\" || char.charCodeAt(0) < 0x20) return fallback;
  }
  return value;
}
