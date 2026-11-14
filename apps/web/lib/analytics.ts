"use client";

// Analytics from the browser. Safe to call anywhere: until analytics is set up and loaded
// (app/_components/Analytics.tsx), these do nothing.

const CHOICE_KEY = "analytics-cookies";

/** What the visitor said about analytics cookies: "yes", "no", or null when not yet asked. */
export function cookieChoice(): "yes" | "no" | null {
  try {
    const value = window.localStorage.getItem(CHOICE_KEY);
    return value === "yes" || value === "no" ? value : null;
  } catch {
    // Storage is blocked (a private window, for one): treat as not allowed, and do not ask.
    return "no";
  }
}

export function rememberCookieChoice(allowed: boolean): void {
  try {
    window.localStorage.setItem(CHOICE_KEY, allowed ? "yes" : "no");
  } catch {
    // Nothing to remember it in; they will be asked again next visit.
  }
}

/**
 * Records a product event, e.g. track("report_exported", { format: "csv" }).
 * @public The template does not call it; a product does.
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  void import("posthog-js").then(({ default: posthog }) => {
    if (posthog.__loaded) posthog.capture(event, properties);
  });
}
