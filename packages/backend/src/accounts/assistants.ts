// Assistant connections: the consent screens in progress and the grants that result.
// apps/mcp calls these; it never touches the database itself.
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import type { Env } from "../env";

const CONSENT_SECONDS = 600;
const nowSeconds = () => Math.floor(Date.now() / 1000);

export async function sha256(value: string): Promise<string> {
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

export async function createGrant(
  env: Env,
  grant: { userId: string; clientId: string; clientName: string; scopes: string[] },
): Promise<string> {
  const id = crypto.randomUUID();
  await getDb(env)
    .insert(schema.assistant_grants)
    .values({
      id,
      user_id: grant.userId,
      client_id: grant.clientId,
      client_name: grant.clientName,
      scope: JSON.stringify(grant.scopes),
    });
  return id;
}

/** True while the connection exists, belongs to this account and has not been removed. */
export async function grantIsActive(env: Env, grantId: string, userId: string): Promise<boolean> {
  const [grant] = await getDb(env)
    .select({ id: schema.assistant_grants.id })
    .from(schema.assistant_grants)
    .where(
      and(
        eq(schema.assistant_grants.id, grantId),
        eq(schema.assistant_grants.user_id, userId),
        isNull(schema.assistant_grants.revoked_at),
      ),
    )
    .limit(1);
  return Boolean(grant);
}
