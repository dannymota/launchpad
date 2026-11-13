"use client";

// Cloudflare Turnstile, shown above the "Send code" button when a site key is configured.
// It hands back a token that the server checks before sending any mail.
import { useEffect, useRef } from "react";

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: { sitekey: string; callback(token: string): void; "expired-callback"(): void; "error-callback"(): void },
  ): string;
  remove(widgetId: string): void;
}

function loadTurnstile(): Promise<TurnstileApi> {
  const existing = (window as { turnstile?: TurnstileApi }).turnstile;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve((window as unknown as { turnstile: TurnstileApi }).turnstile);
    script.onerror = () => reject(new Error("Turnstile could not load."));
    // appendChild, not append: the Workers types this project also loads give `append` another meaning.
    document.head.appendChild(script);
  });
}

export function TurnstileWidget({ siteKey, onToken }: { siteKey: string; onToken(token: string | null): void }) {
  // The widget draws itself into this element, so it has to be a plain one.
  const container = useRef<HTMLDivElement>(null);
  const report = useRef(onToken);
  report.current = onToken;

  useEffect(() => {
    let widgetId: string | undefined;
    let api: TurnstileApi | undefined;
    let gone = false;
    loadTurnstile()
      .then((turnstile) => {
        if (gone || !container.current) return;
        api = turnstile;
        widgetId = turnstile.render(container.current, {
          sitekey: siteKey,
          callback: (token) => report.current(token),
          "expired-callback": () => report.current(null),
          "error-callback": () => report.current(null),
        });
      })
      .catch(() => report.current(null));
    return () => {
      gone = true;
      if (api && widgetId) api.remove(widgetId);
    };
  }, [siteKey]);

  return <div ref={container} />;
}
