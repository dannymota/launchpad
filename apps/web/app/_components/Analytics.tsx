"use client";

// Analytics (PostHog), started once per page load when a key is set. Events go to /ingest
// on this site, which passes them on (packages/backend/src/modules/analytics).
//
// Until a visitor allows cookies, nothing is stored in their browser: visits are counted,
// but a returning visitor looks new. Their answer is remembered either way.
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/Layout";
import { useToast } from "@astryxdesign/core/Toast";
import { useEffect } from "react";
import { cookieChoice, rememberCookieChoice } from "@/lib/analytics";

export function Analytics(props: { apiKey: string | undefined; uiHost: string; productName: string }) {
  const { apiKey, uiHost, productName } = props;
  const showToast = useToast();

  useEffect(() => {
    if (!apiKey) return;
    let stopped = false;
    let dismiss: (() => void) | undefined;
    void import("posthog-js").then(({ default: posthog }) => {
      if (stopped || posthog.__loaded) return;
      const choice = cookieChoice();
      posthog.init(apiKey, {
        api_host: "/ingest",
        ui_host: uiHost,
        persistence: choice === "yes" ? "localStorage+cookie" : "memory",
        person_profiles: "identified_only",
        capture_pageview: "history_change",
        capture_exceptions: true,
        disable_session_recording: true,
      });
      if (choice !== null) return;
      const decide = (allowed: boolean) => {
        rememberCookieChoice(allowed);
        if (allowed) posthog.set_config({ persistence: "localStorage+cookie" });
        dismiss?.();
      };
      dismiss = showToast({
        uniqueID: "analytics-cookies",
        isAutoHide: false,
        body: `${productName} counts visits without cookies. May we set one to recognise you next time?`,
        endContent: (
          <HStack gap={1}>
            <Button label="No thanks" size="sm" variant="ghost" onClick={() => decide(false)} />
            <Button label="Allow" size="sm" onClick={() => decide(true)} />
          </HStack>
        ),
      });
    });
    return () => {
      stopped = true;
      dismiss?.();
    };
  }, [apiKey, uiHost, productName, showToast]);

  return null;
}
