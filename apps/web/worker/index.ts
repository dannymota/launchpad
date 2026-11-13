// The Worker entry. Every HTTP request arrives here; router.ts decides who answers it.
// The cron trigger in wrangler.jsonc runs the daily clean-up.
import { type Env, runScheduled } from "@app/backend";
import pages from "vinext/server/fetch-handler";
import { createRouter, type Pages } from "./router";

export * from "vinext/server/fetch-handler";

const handle = createRouter({ pages: pages as Pages });

export default {
  fetch: handle,
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(runScheduled(env));
  },
} satisfies ExportedHandler<Env>;
