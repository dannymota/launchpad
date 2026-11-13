// The Worker entry. Every HTTP request arrives here; router.ts decides who answers it.
import type { Env } from "@app/backend";
import pages from "vinext/server/fetch-handler";
import { handleRequest, type Pages } from "./router";

export * from "vinext/server/fetch-handler";

export default {
  fetch(request, env, ctx) {
    return handleRequest(request, env, ctx, pages as Pages);
  },
} satisfies ExportedHandler<Env>;
