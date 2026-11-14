// The request router. Every request takes the same steps, in this order:
//   1. /health and /__build
//   2. find the area the path belongs to (product/product.config.ts → access)
//   3. an internal area needs a token from Cloudflare Access, or the answer is 404
//   4. writes from other sites are refused; oversized bodies are refused
//   5. an area that needs a sign-in, or an admin, is checked
//   6. dispatch by path: MCP and OAuth, sign-in (Better Auth), the API (oRPC), then pages (vinext)
//   7. every answer leaves with the security headers
// A path belongs to exactly one handler; API and sign-in paths never fall through to a page.
import {
  AUTH_BASE_PATH,
  // >>> mobile
  appLinks,
  // <<< mobile
  authGate,
  bodyLimit,
  ConfigError,
  clientAddress,
  type Env,
  getAuth,
  handleApi,
  health,
  isApiPath,
  isCrossSiteAuthCallback,
  isCrossSiteWrite,
  isLocalRun,
  moduleRoute,
  productOf,
  type ResponseContext,
  requestPrincipal,
  secured,
  trustedHeaders,
  verifyAccess,
  withProduct,
} from "@app/backend";
// >>> mcp
import { createMcp, type Mcp } from "@app/mcp";
// <<< mcp
import { type Area, type AreaName, areaFor, normalizePath, type Product } from "@app/shared/product";

export interface Pages {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response>;
}

export interface RouterOptions {
  pages: Pages;
  /** Defaults to product/product.config.ts. Tests pass their own to try every preset. */
  product?: Product;
  // >>> mcp
  /** Defaults to the servers in apps/mcp/servers. Tests pass their own. */
  mcp?: Mcp;
  // <<< mcp
}

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });
const notFound = () => json({ code: "NOT_FOUND", message: "Not found." }, 404);
const tooManyRequests = () =>
  new Response(JSON.stringify({ code: "RATE_LIMITED", message: "Too many requests. Slow down and try again." }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": "60", "cache-control": "no-store" },
  });

const isAuthPath = (path: string) => path === AUTH_BASE_PATH || path.startsWith(`${AUTH_BASE_PATH}/`);
const isLoopback = (hostname: string) =>
  hostname === "localhost" || hostname === "[::1]" || hostname.endsWith(".localhost") || /^127\./.test(hostname);

/** What someone with no sign-in gets in an area that needs one: the sign-in page, or 401 for anything that is not a page view. */
function signInNeeded(request: Request, url: URL): Response {
  const wantsPage = request.method === "GET" && (request.headers.get("accept") ?? "").includes("text/html");
  if (!wantsPage) return json({ code: "UNAUTHORIZED", message: "Sign in to continue." }, 401);
  const next = encodeURIComponent(url.pathname + url.search);
  return new Response(null, {
    status: 302,
    headers: { location: `/sign-in?next=${next}`, "cache-control": "no-store" },
  });
}

async function allowedIn(area: Area, env: Env, headers: Headers): Promise<"yes" | "sign-in" | "hidden"> {
  if (area.auth === "none") return "yes";
  const principal = await requestPrincipal(env, headers);
  if (area.auth === "admin") return principal?.admin ? "yes" : "hidden";
  return principal ? "yes" : "sign-in";
}

/** Search engines may index only the public site, on the product's own domain. */
function isIndexable(env: Env, area: AreaName, hostname: string): boolean {
  const product = productOf(env);
  const domain = product.domains.app;
  return (
    area === "site" &&
    product.areas.site.visibility === "public" &&
    Boolean(domain) &&
    (hostname === domain || hostname === `www.${domain}`)
  );
}

/** The edge counter for machine endpoints. Absent in tests and when the binding is not configured. */
async function overRateLimit(env: Env, request: Request): Promise<boolean> {
  if (!env.API_LIMITER) return false;
  const { success } = await env.API_LIMITER.limit({ key: clientAddress(request) });
  return !success;
}

export function createRouter(options: RouterOptions) {
  const { pages, product } = options;
  // >>> mcp
  const mcp = options.mcp ?? createMcp();
  // <<< mcp
  /** Other sites may write only where a protocol requires it. */
  const crossSiteWriteAllowed = (method: string, path: string) => {
    // >>> mcp
    // OAuth and MCP machine calls come from assistants, not from this site's pages.
    if (mcp.isMachinePath(path)) return true;
    // <<< mcp
    // Apple returns the browser with a form POST from its own origin.
    return isCrossSiteAuthCallback(method, path, AUTH_BASE_PATH);
  };

  async function route(request: Request, env: Env, ctx: ExecutionContext, context: ResponseContext): Promise<Response> {
    const url = new URL(request.url);
    // "local" and "test" turn off Secure cookies and real mail. Never on a public host.
    if (isLocalRun(env) && !isLoopback(url.hostname)) {
      throw new ConfigError(`APP_ENV is "${env.APP_ENV}" on ${url.hostname}. Deployed Workers must not set it.`);
    }
    if (url.pathname === "/health") return json(health(env), 200);
    // The running build, so an open page or an installed app can tell when a newer one is live.
    if (url.pathname === "/__build") return json({ id: health(env).version }, 200);

    const path = normalizePath(url.pathname);
    if (path === null) return notFound();
    const { name, area } = areaFor(productOf(env).areas, path);
    context.indexable = isIndexable(env, name, url.hostname);

    // An internal area exists only for people Cloudflare Access let through.
    const access = area.visibility === "internal" ? await verifyAccess(request, env) : null;
    if (area.visibility === "internal" && !access) return notFound();

    if (isCrossSiteWrite(request, url) && !crossSiteWriteAllowed(request.method, path)) {
      return json({ code: "CROSS_SITE", message: "Requests from other sites aren't allowed." }, 403);
    }
    const bounded = bodyLimit(request);
    if ("refused" in bounded) return bounded.refused;

    // From here on, handlers see only what the router established (packages/backend/src/core/request.ts).
    const trusted = new Request(bounded.request, {
      headers: trustedHeaders(request.headers, {
        origin: url.origin,
        identity: area.identity,
        accessEmail: area.identity === "access" ? (access?.email ?? null) : null,
      }),
    });

    const allowed = await allowedIn(area, env, trusted.headers);
    if (allowed === "hidden") return notFound();
    if (allowed === "sign-in") return signInNeeded(request, url);

    // Machine endpoints answer only to the path as written: a spelling the access check had
    // to decode or lowercase never reaches them.
    const exact = path === url.pathname;
    // >>> mcp
    if (mcp.isMcpPath(path)) {
      if (!exact) return notFound();
      if (mcp.isMachinePath(path) && (await overRateLimit(env, request))) return tooManyRequests();
      return mcp.handle(trusted, env, ctx);
    }
    // <<< mcp
    if ((isAuthPath(path) || isApiPath(path)) && !exact) return notFound();
    if (isAuthPath(path)) {
      return (await authGate(trusted, env, AUTH_BASE_PATH)) ?? (await getAuth(env, url.origin)).handler(trusted);
    }
    if (isApiPath(path)) {
      if (await overRateLimit(env, request)) return tooManyRequests();
      return handleApi(trusted, env);
    }
    // A path an optional module serves itself (the analytics proxy, for one). Its service's
    // paths may end in a slash, which the access check drops; nothing else may differ.
    const owned = moduleRoute(env, path);
    if (owned) return exact || url.pathname === `${path}/` ? owned.handle(trusted, env) : notFound();
    // >>> mobile
    // The files that let links to this domain open the native app.
    const links = appLinks(path, env);
    if (links) return links;
    // <<< mobile
    return pages.fetch(trusted, env, ctx);
  }

  return async function handle(request: Request, rawEnv: Env, ctx: ExecutionContext): Promise<Response> {
    const env = withProduct(rawEnv, product);
    const context: ResponseContext = { indexable: false };
    let response: Response;
    try {
      response = await route(request, env, ctx, context);
    } catch (error) {
      // Details stay in the log: an error message can carry upstream responses or settings.
      const event = error instanceof ConfigError ? "config_error" : "request_error";
      const message = error instanceof Error ? error.message : "unknown";
      console.error(JSON.stringify({ event, path: new URL(request.url).pathname, message }));
      response = json({ code: "INTERNAL", message: "Something went wrong. Try again in a moment." }, 500);
    }
    return secured(request, response, env, context);
  };
}
