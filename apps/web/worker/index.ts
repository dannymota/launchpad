// The Worker entry. Every HTTP request arrives here; router.ts decides who answers it.
// The cron trigger in wrangler.jsonc runs the daily clean-up.
import { type Env, productOf, runScheduled } from "@app/backend";
// >>> mcp
import { createMcp } from "@app/mcp";
// <<< mcp
import pages from "vinext/server/fetch-handler";
import { createRouter, type Pages } from "./router";

export * from "vinext/server/fetch-handler";

const handle = createRouter({ pages: pages as Pages });

// >>> mcp
const mcp = createMcp();

/** The address the daily job acts as. It only reads and deletes stored grants, so any stable origin does. */
function jobOrigin(env: Env): string {
  const { domains, slug } = productOf(env);
  return `https://${domains.app || `${slug}.workers.dev`}`;
}
// <<< mcp

async function daily(env: Env): Promise<void> {
  await runScheduled(env);
  // >>> mcp
  // Tokens of connections that ended are deleted from the OAuth provider's store.
  await mcp.sweep(env, jobOrigin(env));
  // <<< mcp
}

export default {
  fetch: handle,
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(daily(env));
  },
} satisfies ExportedHandler<Env>;
