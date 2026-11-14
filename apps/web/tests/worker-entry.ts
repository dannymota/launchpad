// The Worker as the Workers-runtime tests run it: the real router, with a stand-in for the
// page renderer that reports what it was asked for. A test names the product config it
// wants in a request header; production has no such switch.
import type { Env } from "@app/backend";
// >>> mcp
import { createMcp, defineServers, SERVERS } from "@app/mcp";
// <<< mcp
import { createRouter, type Pages } from "../worker/router";
import {
  ENVIRONMENT_HEADER,
  ENVIRONMENTS,
  PRODUCT_HEADER,
  PRODUCTS,
  type ProductName,
  WRITER_SERVER,
} from "./products";

// An HTML document, as a real page is, carrying what it was asked for in a script tag.
const pages: Pages = {
  fetch(request) {
    const seen = JSON.stringify({ page: new URL(request.url).pathname, origin: request.headers.get("x-app-origin") });
    const html = `<!doctype html><html><head><title>Stub</title></head><body><script id="seen" type="application/json">${seen}</script><script>window.ran = true</script></body></html>`;
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  },
};

// >>> mcp
export const mcp = createMcp(defineServers([...SERVERS, WRITER_SERVER]));
// <<< mcp

const routers = new Map<string, ReturnType<typeof createRouter>>();
function routerFor(name: ProductName) {
  let router = routers.get(name);
  if (!router) {
    router = createRouter({
      pages,
      product: PRODUCTS[name],
      // >>> mcp
      mcp,
      // <<< mcp
    });
    routers.set(name, router);
  }
  return router;
}

export default {
  fetch(request, env, ctx) {
    const name = (request.headers.get(PRODUCT_HEADER) ?? "public-product") as ProductName;
    if (!(name in PRODUCTS)) return new Response(`Unknown test product "${name}"`, { status: 500 });
    // Typed loosely: a product with every optional module removed has no extra environments.
    const extra = request.headers.get(ENVIRONMENT_HEADER);
    const settings = extra ? (ENVIRONMENTS as Record<string, Record<string, string>>)[extra] : undefined;
    if (extra && !settings) return new Response(`Unknown test environment "${extra}"`, { status: 500 });
    return routerFor(name)(request, settings ? { ...env, ...settings } : env, ctx);
  },
} satisfies ExportedHandler<Env>;
