// The request router. Every request takes the same steps, in this order:
//   1. /health
//   2. find the area the path belongs to (product/product.config.ts → access)
//   3. an internal area needs a token from Cloudflare Access, or the answer is 404
//   4. writes from other sites are refused
//   5. an area that needs a sign-in, or an admin, is checked
//   6. dispatch by path: MCP and OAuth, sign-in (Better Auth), the API (oRPC), then pages (vinext)
// A path belongs to exactly one handler; API and sign-in paths never fall through to a page.
import {
  AUTH_BASE_PATH,
  authGate,
  ConfigError,
  type Env,
  getAuth,
  handleApi,
  health,
  isApiPath,
  isCrossSiteAuthCallback,
  isCrossSiteWrite,
  isLocalRun,
  productOf,
  requestPrincipal,
  trustedHeaders,
  verifyAccess,
  withProduct,
} from "@app/backend";
import { handleMcp, isMcpMachinePath, isMcpPath } from "@app/mcp";
import { type Area, areaFor, normalizePath, type Product } from "@app/shared/product";

export interface Pages {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response>;
}

export interface RouterOptions {
  pages: Pages;
  /** Defaults to product/product.config.ts. Tests pass their own to try every preset. */
  product?: Product;
}

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });
const notFound = () => json({ code: "NOT_FOUND", message: "Not found." }, 404);

const isAuthPath = (path: string) => path === AUTH_BASE_PATH || path.startsWith(`${AUTH_BASE_PATH}/`);
const isLoopback = (hostname: string) =>
  hostname === "localhost" || hostname === "[::1]" || hostname.endsWith(".localhost") || /^127\./.test(hostname);

/** Other sites may write only where the protocol requires it: OAuth and MCP machine calls, and Apple's callback. */
function crossSiteWriteAllowed(method: string, path: string): boolean {
  return isMcpMachinePath(path) || isCrossSiteAuthCallback(method, path, AUTH_BASE_PATH);
}

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

export function createRouter({ pages, product }: RouterOptions) {
  return async function handle(request: Request, rawEnv: Env, ctx: ExecutionContext): Promise<Response> {
    const env = withProduct(rawEnv, product);
    const url = new URL(request.url);
    try {
      // "local" and "test" turn off Secure cookies and real mail. Never on a public host.
      if (isLocalRun(env) && !isLoopback(url.hostname)) {
        throw new ConfigError(`APP_ENV is "${env.APP_ENV}" on ${url.hostname}. Deployed Workers must not set it.`);
      }
      if (url.pathname === "/health") return json(health(env), 200);

      const path = normalizePath(url.pathname);
      if (path === null) return notFound();
      const { area } = areaFor(productOf(env).areas, path);

      // An internal area exists only for people Cloudflare Access let through.
      const access = area.visibility === "internal" ? await verifyAccess(request, env) : null;
      if (area.visibility === "internal" && !access) return notFound();

      if (isCrossSiteWrite(request, url) && !crossSiteWriteAllowed(request.method, path)) {
        return json({ code: "CROSS_SITE", message: "Requests from other sites aren't allowed." }, 403);
      }

      // From here on, handlers see only what the router established (packages/backend/src/core/request.ts).
      const trusted = new Request(request, {
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
      if (isMcpPath(path)) return exact ? await handleMcp(trusted, env, ctx) : notFound();
      if (isAuthPath(path)) {
        if (!exact) return notFound();
        return (
          (await authGate(trusted, env, AUTH_BASE_PATH)) ?? (await (await getAuth(env, url.origin)).handler(trusted))
        );
      }
      if (isApiPath(path)) return exact ? await handleApi(trusted, env) : notFound();
      return await pages.fetch(trusted, env, ctx);
    } catch (error) {
      // Details stay in the log: an error message can carry upstream responses or settings.
      const event = error instanceof ConfigError ? "config_error" : "request_error";
      const message = error instanceof Error ? error.message : "unknown";
      console.error(JSON.stringify({ event, path: url.pathname, message }));
      return json({ code: "INTERNAL", message: "Something went wrong. Try again in a moment." }, 500);
    }
  };
}
