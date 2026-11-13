// What a person can do to their own account: see and end sessions, and delete the account.
import { and, desc, eq, gt } from "drizzle-orm";
import { UserError } from "../core/errors";
import { getDb, schema } from "../db/client";
import type { Env } from "../env";
import type { Principal } from "./session";

/** How recent a sign-in must be to delete the account. */
const FRESH_SIGN_IN_SECONDS = 10 * 60;

export interface SessionSummary {
  id: string;
  current: boolean;
  createdAt: string;
  userAgent: string;
}

export async function listSessions(env: Env, principal: Principal): Promise<SessionSummary[]> {
  const rows = await getDb(env)
    .select()
    .from(schema.auth_session)
    .where(and(eq(schema.auth_session.user_id, principal.userId), gt(schema.auth_session.expires_at, new Date())))
    .orderBy(desc(schema.auth_session.created_at))
    .limit(100);
  return rows.map((row) => ({
    id: row.id,
    current: row.id === principal.sessionId,
    createdAt: row.created_at.toISOString(),
    userAgent: row.user_agent ?? "",
  }));
}

/** Ends one of the person's own sessions. A session id that is not theirs changes nothing. */
export async function revokeSession(env: Env, principal: Principal, sessionId: string): Promise<void> {
  await getDb(env)
    .delete(schema.auth_session)
    .where(and(eq(schema.auth_session.id, sessionId), eq(schema.auth_session.user_id, principal.userId)));
}

/**
 * Deletes the account. Sessions, linked sign-ins, assistant connections and every feature
 * table that references the account go with it, by cascade: a new table that holds a
 * person's data must reference auth_user with onDelete "cascade".
 */
export async function deleteAccount(env: Env, principal: Principal): Promise<void> {
  if (principal.via === "session") {
    const age = principal.signedInAt === null ? Number.POSITIVE_INFINITY : Date.now() - principal.signedInAt;
    if (age > FRESH_SIGN_IN_SECONDS * 1000) {
      throw new UserError(403, "fresh_sign_in_required", "Sign out, sign in again, then delete your account.");
    }
  }
  await getDb(env).delete(schema.auth_user).where(eq(schema.auth_user.id, principal.userId));
}
