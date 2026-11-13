// Serves the router over HTTP, two ways:
//   /rpc/*  the typed client used by the web and mobile apps (createApiClient)
//   /api/*  plain REST, described by an OpenAPI document
// Both run the same procedures with the same context.
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { RPCHandler } from "@orpc/server/fetch";
import { type Principal, sessionPrincipal } from "../accounts/session";
import type { Env } from "../env";
import type { ApiContext } from "./base";
import { router } from "./router";

export const RPC_PREFIX = "/rpc";
export const REST_PREFIX = "/api";

/** Unexpected failures are logged by message only: never inputs, which may hold personal data. */
async function logUnexpected<T>(options: { next(): Promise<T> }): Promise<T> {
  try {
    return await options.next();
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (!code || code === "INTERNAL_SERVER_ERROR") {
      console.error(
        JSON.stringify({ event: "api_error", message: error instanceof Error ? error.message : "unknown" }),
      );
    }
    throw error;
  }
}

const rpcHandler = new RPCHandler(router, { interceptors: [logUnexpected] });
const restHandler = new OpenAPIHandler(router, { interceptors: [logUnexpected] });

/** Runs `load` at most once, however many procedures in the request ask. */
export function once<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    pending ??= load();
    return pending;
  };
}

export function apiContext(env: Env, loadPrincipal: () => Promise<Principal | null>): ApiContext {
  return { env, loadPrincipal: once(loadPrincipal) };
}

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** True for paths the API owns. The Worker never sends these to the page renderer. */
export function isApiPath(pathname: string): boolean {
  return under(pathname, RPC_PREFIX) || under(pathname, REST_PREFIX);
}

/** Answers /rpc/* and /api/* requests. An API path with no procedure behind it is a JSON 404. */
export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const context = apiContext(env, () => sessionPrincipal(env, url.origin, request.headers));
  const handler = under(url.pathname, RPC_PREFIX) ? rpcHandler : restHandler;
  const prefix = handler === rpcHandler ? RPC_PREFIX : REST_PREFIX;
  const result = await handler.handle(request, { prefix, context });
  if (result.matched) return result.response;
  return Response.json({ code: "NOT_FOUND", message: "No such API route." }, { status: 404 });
}
