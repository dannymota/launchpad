// The Worker as the Workers-runtime tests run it: the real router, with a stand-in for the
// page renderer that reports what it was asked for. A test names the product config it
// wants in a request header; production has no such switch.
import type { Env } from "@app/backend";
import { createRouter, type Pages } from "../worker/router";
import { PRODUCT_HEADER, PRODUCTS, type ProductName } from "./products";

const pages: Pages = {
  fetch(request) {
    return Response.json({ page: new URL(request.url).pathname, origin: request.headers.get("x-app-origin") });
  },
};

const routers = new Map<string, ReturnType<typeof createRouter>>();
function routerFor(name: ProductName) {
  let router = routers.get(name);
  if (!router) {
    router = createRouter({ pages, product: PRODUCTS[name] });
    routers.set(name, router);
  }
  return router;
}

export default {
  fetch(request, env, ctx) {
    const name = (request.headers.get(PRODUCT_HEADER) ?? "public-product") as ProductName;
    if (!(name in PRODUCTS)) return new Response(`Unknown test product "${name}"`, { status: 500 });
    return routerFor(name)(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
