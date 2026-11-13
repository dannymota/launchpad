// The implementer every procedure starts from, and the middleware they share.
import { contract } from "@app/shared/contract";
import { implement, ORPCError } from "@orpc/server";
import type { Principal } from "../accounts/session";
import { UserError } from "../core/errors";
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

/** Requires the person themselves: an assistant acting for them is refused. */
export const inPerson = os.middleware(async ({ context, next }) => {
  const principal = await context.loadPrincipal();
  if (!principal) throw new ORPCError("UNAUTHORIZED", { message: "Sign in to continue." });
  if (principal.via === "assistant") {
    throw new ORPCError("FORBIDDEN", { message: "Only you can do this, not a connected assistant." });
  }
  return next({ context: { principal } });
});

/** Requires an admin. Answers as if the procedure did not exist for anyone else. */
export const adminOnly = os.middleware(async ({ context, next }) => {
  const principal = await context.loadPrincipal();
  if (!principal?.admin) throw new ORPCError("NOT_FOUND", { message: "No such API route." });
  return next({ context: { principal } });
});

const STATUS_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "TOO_MANY_REQUESTS",
  503: "SERVICE_UNAVAILABLE",
};

/**
 * Turns an error meant for the person (UserError) into the matching API error, keeping its
 * message and putting its own code in `data.reason`. Anything else is rethrown and answered
 * as a generic 500.
 */
export async function userErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof UserError) {
      throw new ORPCError(STATUS_CODES[error.status] ?? "BAD_REQUEST", {
        message: error.message,
        data: { reason: error.code },
      });
    }
    throw error;
  }
}
