// The MCP surface. apps/web/worker mounts it: every request whose path isMcpPath() accepts
// goes to handle(). Deleting this folder (npm run remove -- mcp) removes MCP entirely.
import { type Env, endedProviderGrants } from "@app/backend";
import { getOAuthApi } from "@cloudflare/workers-oauth-provider";
import { AUTHORIZE_PATH } from "./oauth/consent";
import {
  mcpProvider,
  providerOptions,
  REGISTER_PATH,
  type ReplaySignal,
  revokeReplayedGrant,
  TOKEN_PATH,
} from "./oauth/provider";
import { SERVERS } from "./servers";
import { MCP_ROOT, type McpServerDefinition } from "./servers/registry";

export { SERVERS } from "./servers";
export { defineServers, type McpServerDefinition } from "./servers/registry";

const SWEEP_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

export interface Mcp {
  /** Paths the OAuth provider and the MCP servers own. Nothing else in the app may use them. */
  isMcpPath(pathname: string): boolean;
  /** Paths that take requests from other origins by design: token exchange, registration and MCP calls. */
  isMachinePath(pathname: string): boolean;
  handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
  /** Deletes the stored tokens of connections that ended recently. Run daily; ending a connection never waits for it. */
  sweep(env: Env, origin: string): Promise<void>;
}

/** The MCP surface for a set of servers. Production uses servers/index.ts; tests pass their own. */
export function createMcp(servers: McpServerDefinition[] = SERVERS): Mcp {
  const isMcpPath = (pathname: string) =>
    pathname === MCP_ROOT ||
    pathname.startsWith(`${MCP_ROOT}/`) ||
    pathname === AUTHORIZE_PATH ||
    pathname === TOKEN_PATH ||
    pathname === REGISTER_PATH ||
    pathname.startsWith("/.well-known/oauth-");

  return {
    isMcpPath,
    isMachinePath: (pathname) => isMcpPath(pathname) && pathname !== AUTHORIZE_PATH,

    async handle(request, env, ctx) {
      const url = new URL(request.url);
      const signal: ReplaySignal = { codeReplayed: false };
      // Kept aside before the provider reads the body, in case the code turns out to be a replay.
      const tokenRequest = url.pathname === TOKEN_PATH && request.method === "POST" ? request.clone() : null;
      const response = await mcpProvider(url.origin, servers, signal).fetch(request, env, ctx);
      // Before answering: from here on the first exchange's tokens no longer work.
      if (signal.codeReplayed && tokenRequest) await revokeReplayedGrant(env, tokenRequest);
      return response;
    },

    async sweep(env, origin) {
      const provider = getOAuthApi(providerOptions(origin, servers, { codeReplayed: false }), env);
      for (const grant of await endedProviderGrants(env, Date.now() - SWEEP_WINDOW_MS)) {
        await provider.revokeGrant(grant.providerGrantId, grant.userId).catch(() => undefined);
      }
    },
  };
}
