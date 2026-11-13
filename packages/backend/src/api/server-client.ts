// Calls procedures in-process, for server-rendered pages. No HTTP hop: the same handlers,
// validation and middleware run as for /rpc and /api, with the page's own principal.
import { createRouterClient, type RouterClient } from "@orpc/server";
import type { Principal } from "../accounts/session";
import type { Env } from "../env";
import { apiContext } from "./handlers";
import { router } from "./router";

export type ServerApi = RouterClient<typeof router>;

export function serverApi(env: Env, loadPrincipal: () => Promise<Principal | null>): ServerApi {
  return createRouterClient(router, { context: apiContext(env, loadPrincipal) });
}
