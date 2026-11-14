// The daily clean-up, run by the Worker's cron trigger. Everything it removes is already
// dead: sessions and codes are checked against their expiry when read, so a late or missed
// run never extends anyone's access.
import { lt } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import type { Env } from "../env";
import { pruneLimits } from "../safety/limits";

const OUTBOX_KEEP_MS = 24 * 60 * 60 * 1000;

export async function runScheduled(env: Env): Promise<void> {
  const db = getDb(env);
  const now = new Date();
  await db.batch([
    db.delete(schema.auth_session).where(lt(schema.auth_session.expires_at, now)),
    db.delete(schema.auth_verification).where(lt(schema.auth_verification.expires_at, now)),
    // >>> mcp
    db.delete(schema.consent_identity).where(lt(schema.consent_identity.expires_at, Math.floor(now.getTime() / 1000))),
    // <<< mcp
    db.delete(schema.email_outbox).where(lt(schema.email_outbox.created_at, new Date(now.getTime() - OUTBOX_KEEP_MS))),
  ]);
  await pruneLimits(env);
}
