// The implementer every procedure starts from, and the middleware they share.
import { contract } from "@app/shared/contract";
import { implement, ORPCError } from "@orpc/server";
import type { Principal } from "../accounts/session";
import type { Env } from "../env";

/** What every procedure call receives. Built once per request by handlers.ts or the MCP server. */
export interface ApiContext {
  env: Env;
  /** Looked up at most once per request, and only when a procedure asks. */
  loadPrincipal: () => Promise<Principal | null>;
}

export const os = implement(contract).$context<ApiContext>();

/** Requires a signed-in person or a connected assistant, and hands the handler its principal. */
export const signedIn = os.middleware(async ({ context, next }) => {
  const principal = await context.loadPrincipal();
  if (!principal) throw new ORPCError("UNAUTHORIZED", { message: "Sign in to continue." });
  return next({ context: { principal } });
});
