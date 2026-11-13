// The OAuth 2.1 provider in front of the MCP servers (@cloudflare/workers-oauth-provider).
// It owns the MCP routes, /oauth/token, /oauth/register and the /.well-known/oauth-*
// documents, and hands /authorize to consent.ts. Its state lives in the OAUTH_KV namespace.
//
// Whether a connection is alive is decided in D1 (packages/backend, accounts/assistants.ts),
// checked on every MCP call and every token refresh. KV is eventually consistent; D1 is not.
import {
  type ActiveGrant,
  activeGrant,
  attachProviderGrant,
  type Env,
  noteGrantUse,
  revokeProviderGrant,
} from "@app/backend";
import { REQUIRED_SCOPE, SCOPES } from "@app/shared";
import {
  GrantType,
  insufficientScope,
  OAuthError,
  OAuthProvider,
  type OAuthProviderOptions,
  type OAuthResourceAuth,
} from "@cloudflare/workers-oauth-provider";
import { createMcpHandler } from "agents/mcp/server";
import { buildServer, toolScopes } from "../servers/build";
import { MCP_ROOT, type McpServerDefinition } from "../servers/registry";
import { AUTHORIZE_PATH, authorize } from "./consent";

export const TOKEN_PATH = "/oauth/token";
export const REGISTER_PATH = "/oauth/register";
const ACCESS_TOKEN_SECONDS = 60 * 60;
const REFRESH_WINDOW_SECONDS = 60 * 60 * 24 * 30;

/** What completeAuthorization() stored for the connection; the provider returns it on every MCP call. */
interface GrantProps {
  userId?: string;
  assistantGrantId?: string;
}
type AuthContext = ExecutionContext & { props?: GrantProps; auth?: OAuthResourceAuth };

/** The connection behind a call, while it is current and still holds the required scope. */
async function liveGrant(env: Env, props: GrantProps | undefined, scope: string[]): Promise<ActiveGrant | null> {
  if (!props?.userId || !props.assistantGrantId || !scope.includes(REQUIRED_SCOPE)) return null;
  return activeGrant(env, props.assistantGrantId, props.userId);
}

const invalidToken = () =>
  Response.json(
    { error: "invalid_token" },
    { status: 401, headers: { "www-authenticate": 'Bearer error="invalid_token"', "cache-control": "no-store" } },
  );

/** The tools a JSON-RPC request asks to call. Empty for anything else, or a body that cannot be read. */
async function calledTools(request: Request): Promise<string[]> {
  if (request.method !== "POST" || !(request.headers.get("content-type") ?? "").includes("json")) return [];
  try {
    const body: unknown = await request.clone().json();
    const messages = Array.isArray(body) ? body : [body];
    return messages.flatMap((message) => {
      const { method, params } = (message ?? {}) as { method?: unknown; params?: { name?: unknown } };
      return method === "tools/call" && typeof params?.name === "string" ? [params.name] : [];
    });
  } catch {
    return [];
  }
}

/** Reached only with a token the provider has already verified. */
function mcpHandler(definition: McpServerDefinition) {
  return {
    async fetch(request: Request, env: Env, rawCtx: ExecutionContext): Promise<Response> {
      const ctx = rawCtx as AuthContext;
      const auth = ctx.auth;
      const grant = auth?.clientId ? await liveGrant(env, ctx.props, auth.scope) : null;
      if (!auth || !grant) return invalidToken();

      // A tool the connection was not allowed: say which permission is missing, so the
      // assistant can ask the person for it, instead of a bare failure.
      const scopes = await toolScopes(definition);
      const missing = (await calledTools(request))
        .map((tool) => scopes.get(tool))
        .filter((scope): scope is string => Boolean(scope) && !auth.scope.includes(scope as string));
      if (missing.length > 0) return insufficientScope(auth, [...new Set(missing)]);

      ctx.waitUntil(noteGrantUse(env, grant));
      const url = new URL(request.url);
      const handler = createMcpHandler(
        () => buildServer(env, definition, { userId: grant.userId, scopes: auth.scope }),
        {
          route: definition.route,
          authContext: { props: { ...ctx.props } },
          corsOptions: { exposeHeaders: "mcp-session-id, WWW-Authenticate" },
        },
      );
      // The provider puts the verified identity on ctx.auth; the MCP handler takes it as an option.
      return handler.fetch(request, {
        authInfo: {
          token: auth.token,
          clientId: auth.clientId as string,
          scopes: auth.scope,
          expiresAt: auth.expiresAt,
          resource: auth.audience ? new URL(auth.audience) : undefined,
          resourceMetadataUrl: `${url.origin}/.well-known/oauth-protected-resource${MCP_ROOT}`,
          extra: { props: ctx.props },
        },
      });
    },
  };
}

/** Tells the caller when the provider refused an authorization code because it had been used before. */
export interface ReplaySignal {
  codeReplayed: boolean;
}

export function providerOptions(
  origin: string,
  servers: McpServerDefinition[],
  signal: ReplaySignal,
): OAuthProviderOptions<Env> {
  return {
    apiHandlers: Object.fromEntries(servers.map((server) => [server.route, mcpHandler(server)])),
    defaultHandler: {
      async fetch(request: Request, env: Env) {
        if (new URL(request.url).pathname === AUTHORIZE_PATH) return authorize(request, env);
        return Response.json({ error: "not_found" }, { status: 404 });
      },
    },
    authorizeEndpoint: AUTHORIZE_PATH,
    tokenEndpoint: TOKEN_PATH,
    clientRegistrationEndpoint: REGISTER_PATH,
    // One protected resource: every server lives at /mcp or under it, and a token is for all of
    // them. What a connection may do on each is decided by its scopes.
    resourceMetadata: {
      resource: origin + MCP_ROOT,
      authorization_servers: [origin],
      resource_name: servers.at(-1)?.name,
    },
    scopesSupported: Object.keys(SCOPES),
    accessTokenTTL: ACCESS_TOKEN_SECONDS,
    refreshTokenTTL: REFRESH_WINDOW_SECONDS,
    clientIdMetadataDocumentEnabled: true,
    onError: (error) => {
      // Set only after the provider has checked the code's secret and its client.
      if (error.internal?.category === "authorization-code-grant" && error.internal.reason === "code_replayed") {
        signal.codeReplayed = true;
      }
    },
    tokenExchangeCallback: async (exchange) => {
      const env = exchange.env as Env;
      const props = exchange.props as GrantProps;
      if (!(await liveGrant(env, props, exchange.scope))) {
        throw new OAuthError("invalid_grant", { description: "This connection was removed." });
      }
      const offline = exchange.scope.includes("offline_access");
      if (exchange.grantType === GrantType.REFRESH_TOKEN && !offline) {
        throw new OAuthError("invalid_grant", { description: "Staying connected was not allowed." });
      }
      if (exchange.grantType === GrantType.AUTHORIZATION_CODE) {
        // The provider's own id for the grant: needed later to find it when a code is replayed
        // and to delete its tokens from the provider's store.
        await attachProviderGrant(env, props.assistantGrantId as string, exchange.grantId);
        // The provider does not read this from the scope: consent decides whether a refresh token is issued.
        return { refreshTokenTTL: offline ? REFRESH_WINDOW_SECONDS : 0 };
      }
      return undefined;
    },
  };
}

/** Built per request: the resource metadata names this request's origin. */
export function mcpProvider(origin: string, servers: McpServerDefinition[], signal: ReplaySignal): OAuthProvider<Env> {
  return new OAuthProvider<Env>(providerOptions(origin, servers, signal));
}

/**
 * An authorization code presented twice means the first set of tokens may be in the wrong
 * hands (OAuth 2.1 §4.1.2). The connection it belongs to ends at once. The code's format,
 * `user:grant:secret`, is the provider's documented one, read only after the provider itself
 * has verified the code.
 */
export async function revokeReplayedGrant(env: Env, tokenRequest: Pick<Request, "formData">): Promise<void> {
  const form = await tokenRequest.formData().catch(() => null);
  const code = form?.get("code");
  const [userId, providerGrantId, secret] = typeof code === "string" ? code.split(":") : [];
  if (!userId || !providerGrantId || !secret) return;
  await revokeProviderGrant(env, userId, providerGrantId, "code_replay");
}
