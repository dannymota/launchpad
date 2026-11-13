// The Worker entry. Every HTTP request arrives here; router.ts decides who answers it.
// The cron trigger in wrangler.jsonc runs the daily clean-up.
import { type Env, productOf, runScheduled } from "@app/backend";
import { createMcp } from "@app/mcp";
import pages from "vinext/server/fetch-handler";
import { createRouter, type Pages } from "./router";

export * from "vinext/server/fetch-handler";

const mcp = createMcp();
const handle = createRouter({ pages: pages as Pages, mcp });

/** The address the daily job acts as. It only reads and deletes stored grants, so any stable origin does. */
function jobOrigin(env: Env): string {
  const { domains, slug } = productOf(env);
  return `https://${domains.app || `${slug}.workers.dev`}`;
}

export default {
  fetch: handle,
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(runScheduled(env).then(() => mcp.sweep(env, jobOrigin(env))));
  },
} satisfies ExportedHandler<Env>;
