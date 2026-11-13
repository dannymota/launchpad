// The OAuth 2.1 provider in front of the MCP servers (@cloudflare/workers-oauth-provider).
// It owns the MCP routes, /oauth/token, /oauth/register and the /.well-known/oauth-*
// documents, and hands /authorize to consent.ts. Its state lives in the OAUTH_KV namespace.
import { type Env, grantIsActive } from "@app/backend";
import { REQUIRED_SCOPE, SCOPES } from "@app/shared";
import { GrantType, OAuthError, OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { createMcpHandler } from "agents/mcp/server";
import { ROUTE, SERVER_NAME } from "../servers/main/scopes";
import { createServer } from "../servers/main/server";
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
interface VerifiedToken {
  token: string;
  clientId: string;
  scope: string[];
  expiresAt?: number;
  audience?: string;
}
type AuthContext = ExecutionContext & { props?: GrantProps; auth?: VerifiedToken };

/** The connection behind a call, while it is current and still holds the required scope. */
async function activeGrant(env: Env, props: GrantProps | undefined, scope: string[]): Promise<boolean> {
  if (!props?.userId || !props.assistantGrantId || !scope.includes(REQUIRED_SCOPE)) return false;
  return grantIsActive(env, props.assistantGrantId, props.userId);
}

const invalidToken = () =>
  Response.json(
    { error: "invalid_token" },
    { status: 401, headers: { "www-authenticate": 'Bearer error="invalid_token"', "cache-control": "no-store" } },
  );

/** Reached only with a token the provider has already verified. */
const mcpHandler = {
  async fetch(request: Request, env: Env, rawCtx: ExecutionContext): Promise<Response> {
    const ctx = rawCtx as AuthContext;
    const auth = ctx.auth;
    if (!auth?.clientId || !(await activeGrant(env, ctx.props, auth.scope))) return invalidToken();
    const userId = ctx.props!.userId!;
    const url = new URL(request.url);
    const resourceMetadataUrl = `${url.origin}/.well-known/oauth-protected-resource${ROUTE}`;
    const handler = createMcpHandler(() => createServer(env, { userId, scopes: auth.scope }), {
      route: ROUTE,
      authContext: { props: { ...ctx.props } },
      corsOptions: { exposeHeaders: "mcp-session-id, WWW-Authenticate" },
    });
    // The provider puts the verified identity on ctx.auth; the MCP handler takes it as an option.
    return handler.fetch(request, {
      authInfo: {
        token: auth.token,
        clientId: auth.clientId,
        scopes: auth.scope,
        expiresAt: auth.expiresAt,
        resource: auth.audience ? new URL(auth.audience) : undefined,
        resourceMetadataUrl,
        extra: { props: ctx.props },
      },
    });
  },
};

/** Built per request: the resource metadata names this request's origin. */
export function mcpProvider(origin: string): OAuthProvider<Env> {
  return new OAuthProvider<Env>({
    apiRoute: ROUTE,
    apiHandler: mcpHandler,
    defaultHandler: {
      async fetch(request: Request, env: Env) {
        if (new URL(request.url).pathname === AUTHORIZE_PATH) return authorize(request, env);
        return Response.json({ error: "not_found" }, { status: 404 });
      },
    },
    authorizeEndpoint: AUTHORIZE_PATH,
    tokenEndpoint: TOKEN_PATH,
    clientRegistrationEndpoint: REGISTER_PATH,
    resourceMetadata: { resource: origin + ROUTE, authorization_servers: [origin], resource_name: SERVER_NAME },
    scopesSupported: Object.keys(SCOPES),
    accessTokenTTL: ACCESS_TOKEN_SECONDS,
    refreshTokenTTL: REFRESH_WINDOW_SECONDS,
    clientIdMetadataDocumentEnabled: true,
    tokenExchangeCallback: async (options) => {
      if (!(await activeGrant(options.env as Env, options.props as GrantProps, options.scope))) {
        throw new OAuthError("invalid_grant", { description: "This connection was removed." });
      }
      const offline = options.scope.includes("offline_access");
      if (options.grantType === GrantType.REFRESH_TOKEN && !offline) {
        throw new OAuthError("invalid_grant", { description: "Staying connected was not allowed." });
      }
      // The provider does not read this from the scope: consent decides whether a refresh token is issued.
      if (options.grantType === GrantType.AUTHORIZATION_CODE) {
        return { refreshTokenTTL: offline ? REFRESH_WINDOW_SECONDS : 0 };
      }
      return undefined;
    },
  });
}
