// What admins can do to accounts. Reached only through the admin API area, which is behind
// Cloudflare Access in every preset.
import { desc, eq, lt } from "drizzle-orm";
import { UserError } from "../core/errors";
import { getDb, schema } from "../db/client";
import type { Env } from "../env";
import type { Principal } from "./session";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  banned: boolean;
}

export async function listUsers(
  env: Env,
  options: { limit: number; before?: string },
): Promise<{ users: AdminUserRow[]; next: string | null }> {
  const table = schema.auth_user;
  const rows = await getDb(env)
    .select()
    .from(table)
    .where(options.before ? lt(table.created_at, new Date(options.before)) : undefined)
    .orderBy(desc(table.created_at))
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit);
  const users = page.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at.toISOString(),
    banned: Boolean(row.banned),
  }));
  const last = users.at(-1);
  return { users, next: rows.length > options.limit && last ? last.createdAt : null };
}

/** Banning ends every session and assistant connection at once, in one batch. */
export async function setBanned(env: Env, admin: Principal, userId: string, banned: boolean): Promise<void> {
  if (banned && userId === admin.userId)
    throw new UserError(400, "cannot_ban_self", "You cannot ban your own account.");
  const db = getDb(env);
  const update = db
    .update(schema.auth_user)
    .set({ banned, ban_reason: null, ban_expires: null })
    .where(eq(schema.auth_user.id, userId));
  if (!banned) {
    await update;
    return;
  }
  await db.batch([
    update,
    db.delete(schema.auth_session).where(eq(schema.auth_session.user_id, userId)),
    db
      .update(schema.assistant_grants)
      .set({ revoked_at: new Date() })
      .where(eq(schema.assistant_grants.user_id, userId)),
    db.delete(schema.consent_identity).where(eq(schema.consent_identity.user_id, userId)),
  ]);
}
