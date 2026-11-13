// The Worker as the Workers-runtime tests run it: the real router, with a stand-in for the
// page renderer that reports what it was asked for.
import type { Env } from "@app/backend";
import { handleRequest, type Pages } from "../worker/router";

const pages: Pages = {
  fetch(request) {
    return Response.json({ page: new URL(request.url).pathname, origin: request.headers.get("x-app-origin") });
  },
};

export default {
  fetch(request, env, ctx) {
    return handleRequest(request, env, ctx, pages);
  },
} satisfies ExportedHandler<Env>;
