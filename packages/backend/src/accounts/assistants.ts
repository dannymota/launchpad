// Assistant connections: the consent screens in progress and the grants that result.
// apps/mcp calls these; it never touches the database itself.
//
// A grant row here is the authority on whether a connection is alive. Every MCP call and
// every token refresh checks it, so ending a connection takes effect at once, whatever the
// OAuth provider's own store (KV, which is eventually consistent) still holds.
import { and, desc, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import type { Env } from "../env";

const CONSENT_SECONDS = 600;
/** A connection's last use is written at most this often. */
const USE_INTERVAL_MS = 10 * 60 * 1000;
const nowSeconds = () => Math.floor(Date.now() / 1000);

export type RevokeReason = "person" | "replaced" | "banned" | "code_replay";

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface PendingConsent {
  clientName: string;
  /** The client's verified domain, or "" when its name is self-asserted. */
  clientDomain: string;
  redirectHost: string;
  scopes: string[];
}

/** Binds a consent handle to the person who started it. Only the handle's hash is stored. */
export async function bindConsent(env: Env, handle: string, userId: string, consent: PendingConsent): Promise<void> {
  await getDb(env)
    .insert(schema.consent_identity)
    .values({
      handle_hash: await sha256(handle),
      user_id: userId,
      client_name: consent.clientName,
      client_domain: consent.clientDomain,
      redirect_host: consent.redirectHost,
      scope: JSON.stringify(consent.scopes),
      expires_at: nowSeconds() + CONSENT_SECONDS,
    });
}

function toPending(row: typeof schema.consent_identity.$inferSelect): PendingConsent {
  return {
    clientName: row.client_name,
    clientDomain: row.client_domain,
    redirectHost: row.redirect_host,
    scopes: JSON.parse(row.scope) as string[],
  };
}

const ownedAndCurrent = (handleHash: string, userId: string) =>
  and(
    eq(schema.consent_identity.handle_hash, handleHash),
    eq(schema.consent_identity.user_id, userId),
    gt(schema.consent_identity.expires_at, nowSeconds()),
  );

/** What the consent page shows. Null when the handle is unknown, expired or someone else's. */
export async function readConsent(env: Env, handle: string, userId: string): Promise<PendingConsent | null> {
  const [row] = await getDb(env)
    .select()
    .from(schema.consent_identity)
    .where(ownedAndCurrent(await sha256(handle), userId))
    .limit(1);
  return row ? toPending(row) : null;
}

/** Uses up a consent handle. Checked and deleted in one statement, so it works exactly once. */
export async function takeConsent(env: Env, handle: string, userId: string): Promise<PendingConsent | null> {
  const [row] = await getDb(env)
    .delete(schema.consent_identity)
    .where(ownedAndCurrent(await sha256(handle), userId))
    .returning();
  return row ? toPending(row) : null;
}

const grants = schema.assistant_grants;
const active = (userId: string) => and(eq(grants.user_id, userId), isNull(grants.revoked_at));

/**
 * Records a new connection. An earlier connection of the same app (same client key) for this
 * person ends in the same batch. Returns the new grant's id and the provider grant ids of
 * the connections it replaced, for the caller to delete from the provider's store.
 */
export async function createGrant(
  env: Env,
  grant: { userId: string; clientId: string; clientName: string; clientKey: string; scopes: string[] },
): Promise<{ id: string; replaced: string[] }> {
  const db = getDb(env);
  const id = crypto.randomUUID();
  const [replaced] = await db.batch([
    db
      .update(grants)
      .set({ revoked_at: new Date(), revoked_reason: "replaced" satisfies RevokeReason })
      .where(and(active(grant.userId), eq(grants.client_key, grant.clientKey)))
      .returning({ providerGrantId: grants.provider_grant_id }),
    db.insert(grants).values({
      id,
      user_id: grant.userId,
      client_id: grant.clientId,
      client_name: grant.clientName,
      client_key: grant.clientKey,
      scope: JSON.stringify(grant.scopes),
    }),
  ]);
  return {
    id,
    replaced: replaced.map((row) => row.providerGrantId).filter((value): value is string => Boolean(value)),
  };
}

/** Notes the provider's id for a grant, once the provider has issued it. */
export async function attachProviderGrant(env: Env, grantId: string, providerGrantId: string): Promise<void> {
  await getDb(env).update(grants).set({ provider_grant_id: providerGrantId }).where(eq(grants.id, grantId));
}

export interface ActiveGrant {
  id: string;
  userId: string;
  lastUsedAt: Date | null;
}

/** The connection, while it exists, belongs to this account and has not ended. */
export async function activeGrant(env: Env, grantId: string, userId: string): Promise<ActiveGrant | null> {
  const [grant] = await getDb(env)
    .select({ id: grants.id, userId: grants.user_id, lastUsedAt: grants.last_used_at })
    .from(grants)
    .where(and(eq(grants.id, grantId), active(userId)))
    .limit(1);
  return grant ?? null;
}

/** Notes that a connection made a call. Most calls write nothing; a failed note never fails the call. */
export async function noteGrantUse(env: Env, grant: ActiveGrant): Promise<void> {
  const now = Date.now();
  if (grant.lastUsedAt && now - grant.lastUsedAt.getTime() < USE_INTERVAL_MS) return;
  await getDb(env)
    .update(grants)
    .set({ last_used_at: new Date(now) })
    .where(
      and(
        eq(grants.id, grant.id),
        or(isNull(grants.last_used_at), lt(grants.last_used_at, new Date(now - USE_INTERVAL_MS))),
      ),
    )
    .catch(() => undefined);
}

export interface GrantSummary {
  id: string;
  clientName: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

/** The person's live connections, newest first. */
export async function listGrants(env: Env, userId: string): Promise<GrantSummary[]> {
  const rows = await getDb(env).select().from(grants).where(active(userId)).orderBy(desc(grants.created_at)).limit(100);
  return rows.map((row) => ({
    id: row.id,
    clientName: row.client_name,
    scopes: JSON.parse(row.scope) as string[],
    createdAt: row.created_at.toISOString(),
    lastUsedAt: row.last_used_at?.toISOString() ?? null,
  }));
}

/** Ends one of the person's own connections. A grant id that is not theirs changes nothing. */
export async function revokeGrant(
  env: Env,
  userId: string,
  grantId: string,
  reason: RevokeReason = "person",
): Promise<void> {
  await getDb(env)
    .update(grants)
    .set({ revoked_at: new Date(), revoked_reason: reason })
    .where(and(eq(grants.id, grantId), active(userId)));
}

/**
 * Ends the connection behind a provider grant. Used when an authorization code is presented
 * twice: the tokens the first use produced may be in the wrong hands, so they stop working.
 */
export async function revokeProviderGrant(
  env: Env,
  userId: string,
  providerGrantId: string,
  reason: RevokeReason,
): Promise<void> {
  await getDb(env)
    .update(grants)
    .set({ revoked_at: new Date(), revoked_reason: reason })
    .where(and(active(userId), eq(grants.provider_grant_id, providerGrantId)));
}

/** Ended connections whose tokens may still sit in the provider's store, for the daily sweep. */
export async function endedProviderGrants(
  env: Env,
  sinceMs: number,
): Promise<{ userId: string; providerGrantId: string }[]> {
  const rows = await getDb(env)
    .select({ userId: grants.user_id, providerGrantId: grants.provider_grant_id })
    .from(grants)
    .where(
      and(isNotNull(grants.revoked_at), gt(grants.revoked_at, new Date(sinceMs)), isNotNull(grants.provider_grant_id)),
    )
    .limit(500);
  return rows.filter((row): row is { userId: string; providerGrantId: string } => Boolean(row.providerGrantId));
}
