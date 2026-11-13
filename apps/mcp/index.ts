// The MCP surface. apps/web/worker mounts it: every request whose path isMcpPath() accepts
// goes to handleMcp(). Deleting this folder (npm run remove -- mcp) removes MCP entirely.
import type { Env } from "@app/backend";
import { AUTHORIZE_PATH } from "./oauth/consent";
import { mcpProvider, REGISTER_PATH, TOKEN_PATH } from "./oauth/provider";
import { ROUTE } from "./servers/main/scopes";

/** Paths the OAuth provider and the MCP servers own. Nothing else in the app may use them. */
export function isMcpPath(pathname: string): boolean {
  return (
    pathname === ROUTE ||
    pathname.startsWith(`${ROUTE}/`) ||
    pathname === AUTHORIZE_PATH ||
    pathname === TOKEN_PATH ||
    pathname === REGISTER_PATH ||
    pathname.startsWith("/.well-known/oauth-")
  );
}

/** Paths that take requests from other origins by design: token exchange, registration and MCP calls. */
export function isMcpMachinePath(pathname: string): boolean {
  return isMcpPath(pathname) && pathname !== AUTHORIZE_PATH;
}

export function handleMcp(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  return mcpProvider(new URL(request.url).origin).fetch(request, env, ctx);
}
