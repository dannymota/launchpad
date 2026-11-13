// The request router. Order matters and is the same for every request:
//   1. /health
//   2. the cross-site write check
//   3. dispatch by path: MCP and OAuth, sign-in (Better Auth), the API (oRPC), then pages (vinext)
// A path belongs to exactly one handler; API and sign-in paths never fall through to a page.
import {
  AUTH_BASE_PATH,
  ConfigError,
  type Env,
  getAuth,
  handleApi,
  health,
  isApiPath,
  isCrossSiteAuthCallback,
  isCrossSiteWrite,
} from "@app/backend";
import { handleMcp, isMcpMachinePath, isMcpPath } from "@app/mcp";
import { ORIGIN_HEADER } from "../lib/request";

export interface Pages {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response>;
}

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

const isAuthPath = (pathname: string) => pathname === AUTH_BASE_PATH || pathname.startsWith(`${AUTH_BASE_PATH}/`);

/** Other sites may write only where the protocol requires it: OAuth and MCP machine calls, and Apple's callback. */
function crossSiteWriteAllowed(method: string, pathname: string): boolean {
  return isMcpMachinePath(pathname) || isCrossSiteAuthCallback(method, pathname, AUTH_BASE_PATH);
}

/** The request as pages see it: with the origin header the page helpers read (lib/server.ts). */
function forPages(request: Request, url: URL): Request {
  const headers = new Headers(request.headers);
  headers.set(ORIGIN_HEADER, url.origin);
  return new Request(request, { headers });
}

export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  pages: Pages,
): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  try {
    if (pathname === "/health") return json(health(env), 200);

    if (isCrossSiteWrite(request, url) && !crossSiteWriteAllowed(request.method, pathname)) {
      return json({ code: "CROSS_SITE", message: "Requests from other sites aren't allowed." }, 403);
    }

    if (isMcpPath(pathname)) return await handleMcp(request, env, ctx);
    if (isAuthPath(pathname)) return await getAuth(env, url.origin).handler(request);
    if (isApiPath(pathname)) return await handleApi(request, env);
    return await pages.fetch(forPages(request, url), env, ctx);
  } catch (error) {
    // Details stay in the log: an error message can carry upstream responses or settings.
    const event = error instanceof ConfigError ? "config_error" : "request_error";
    console.error(
      JSON.stringify({ event, path: pathname, message: error instanceof Error ? error.message : "unknown" }),
    );
    return json({ code: "INTERNAL", message: "Something went wrong. Try again in a moment." }, 500);
  }
}
