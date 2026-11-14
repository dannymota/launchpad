// Analytics: PostHog for page views, events, feature flags and error reports. On when
// POSTHOG_KEY is set; until then no script loads and /ingest does not exist.
//
// Browsers and the mobile app send events to /ingest on this Worker, which passes them on
// to PostHog (proxy.ts). First-party requests are not dropped by ad blockers, and the page's
// content security policy needs no third-party host.
import type { BackendModule } from "../../core/modules";
import type { Env } from "../../env";
import { INGEST_PREFIX, proxy } from "./proxy";

export const analytics: BackendModule = {
  name: "analytics",
  on: (env: Env) => Boolean(env.POSTHOG_KEY),
  routes: [{ prefix: INGEST_PREFIX, handle: proxy }],
};
