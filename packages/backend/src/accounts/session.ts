// Who a request is acting for. One shape for every way in: a browser or mobile session
// (Better Auth) and an assistant connection (OAuth grant).
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import type { Env } from "../env";
import { getAuth } from "./auth";

export interface Principal {
  userId: string;
  email: string;
  name: string;
  /** "session": a signed-in browser or app. "assistant": an MCP client acting under a grant. */
  via: "session" | "assistant";
  /** Granted OAuth scopes. Empty for sessions, which are not scope-limited. */
  scopes: string[];
}

/** The signed-in person behind these request headers, or null. */
export async function sessionPrincipal(env: Env, origin: string, headers: Headers): Promise<Principal | null> {
  const session = await getAuth(env, origin).api.getSession({ headers });
  if (!session) return null;
  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    via: "session",
    scopes: [],
  };
}

/** The account an assistant grant acts for. Null when the account no longer exists. */
export async function assistantPrincipal(env: Env, userId: string, scopes: string[]): Promise<Principal | null> {
  const [user] = await getDb(env).select().from(schema.auth_user).where(eq(schema.auth_user.id, userId)).limit(1);
  if (!user) return null;
  return { userId: user.id, email: user.email, name: user.name, via: "assistant", scopes };
}
