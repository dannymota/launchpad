// Who a request is acting for. One shape for every way in: a browser or app session
// (Better Auth), a Cloudflare Access identity (internal areas that opt in) and an
// assistant connection (OAuth grant).
import { eq } from "drizzle-orm";
import { listOf } from "../core/product";
import { requestFacts } from "../core/request";
import { getDb, schema } from "../db/client";
import type { Env } from "../env";
import { getAuth } from "./auth";

/**
 * How a request is identified. "session": a signed-in browser or app. "access": the
 * Cloudflare Access email, in an internal area that takes it as the sign-in.
 */
export type Via =
  | "session"
  | "access"
  // >>> mcp
  // An MCP client acting under a grant the person approved.
  | "assistant";
// <<< mcp

export interface Principal {
  userId: string;
  email: string;
  name: string;
  via: Via;
  // >>> mcp
  /** Granted OAuth scopes. Empty unless via is "assistant". */
  scopes: string[];
  // <<< mcp
  /** True only for an Access-verified email listed in ADMIN_EMAILS. */
  admin: boolean;
  /** The Better Auth session behind the request, and when it signed in. Null unless via is "session". */
  sessionId: string | null;
  signedInAt: number | null;
}

type UserRow = typeof schema.auth_user.$inferSelect;
const usable = (user: UserRow | undefined): user is UserRow => Boolean(user && !user.banned);

/** The signed-in person behind a Better Auth session cookie or token, or null. */
export async function sessionPrincipal(env: Env, origin: string, headers: Headers): Promise<Principal | null> {
  const session = await (await getAuth(env, origin)).api.getSession({ headers });
  if (!session) return null;
  const { id, email, name } = session.user;
  return {
    userId: id,
    email,
    name,
    via: "session",
    // >>> mcp
    scopes: [],
    // <<< mcp
    admin: false,
    sessionId: session.session.id,
    signedInAt: new Date(session.session.createdAt).getTime(),
  };
}

/**
 * The account for an email Cloudflare Access has verified, created on first use. Access
 * already decided this person may come in, so the signup gate does not apply here.
 */
export async function accessPrincipal(env: Env, verifiedEmail: string): Promise<Principal | null> {
  const email = verifiedEmail.trim().toLowerCase();
  const db = getDb(env);
  const find = () => db.select().from(schema.auth_user).where(eq(schema.auth_user.email, email)).limit(1);
  let [user] = await find();
  if (!user) {
    const now = new Date();
    await db
      .insert(schema.auth_user)
      .values({ id: crypto.randomUUID(), name: "", email, email_verified: true, created_at: now, updated_at: now })
      .onConflictDoNothing();
    [user] = await find();
  }
  if (!usable(user)) return null;
  const admin = listOf(env.ADMIN_EMAILS).includes(email);
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    via: "access",
    // >>> mcp
    scopes: [],
    // <<< mcp
    admin,
    sessionId: null,
    signedInAt: null,
  };
}

// >>> mcp
/** The account an assistant grant acts for. Null when the account is gone or banned. */
export async function assistantPrincipal(env: Env, userId: string, scopes: string[]): Promise<Principal | null> {
  const [user] = await getDb(env).select().from(schema.auth_user).where(eq(schema.auth_user.id, userId)).limit(1);
  if (!usable(user)) return null;
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    via: "assistant",
    scopes,
    admin: false,
    sessionId: null,
    signedInAt: null,
  };
}
// <<< mcp

/**
 * Who a request that came through the Worker's router is acting for. The router has already
 * decided, from the area the path belongs to, whether the Access email or a session counts.
 */
export async function requestPrincipal(env: Env, headers: Headers): Promise<Principal | null> {
  const facts = requestFacts(headers);
  if (!facts) throw new Error("This request did not come through the Worker's router.");
  if (facts.identity === "access") return facts.accessEmail ? accessPrincipal(env, facts.accessEmail) : null;
  return sessionPrincipal(env, facts.origin, headers);
}
