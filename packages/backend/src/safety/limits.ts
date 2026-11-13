// Attempt limits kept in D1, for actions where a limit must hold across every Worker
// instance and survive restarts: sign-in codes, sign-in attempts, account deletion.
import { lt, sql } from "drizzle-orm";
import { authSettings } from "../core/auth-settings";
import { getDb, schema } from "../db/client";
import type { Env } from "../env";

export const LIMITS = {
  // Sending a code costs an email. Per address, per client, and per network per day, so one
  // person cannot be flooded and one network cannot spend the whole mail budget.
  codeEmail: { attempts: 5, windowSeconds: 900 },
  codeIp: { attempts: 20, windowSeconds: 900 },
  codeNetworkDay: { attempts: 60, windowSeconds: 86_400 },
  // Guessing a code. Better Auth also caps attempts per code; this caps them per client.
  signInEmail: { attempts: 10, windowSeconds: 900 },
  signInIp: { attempts: 30, windowSeconds: 900 },
  // Starting a Google or Apple sign-in, and the callbacks that finish one.
  socialIp: { attempts: 30, windowSeconds: 900 },
  // Everything else under /api/auth: reading the session, listing and ending sessions.
  sessionIp: { attempts: 300, windowSeconds: 300 },
  // Mail costs money and reputation. One recipient gets at most this many a day, and the whole
  // product sends at most this many a day, whatever asks for them.
  emailRecipientDay: { attempts: 10, windowSeconds: 86_400 },
  emailTotalDay: { attempts: 500, windowSeconds: 86_400 },
} as const;
export type LimitName = keyof typeof LIMITS;

async function bucketOf(env: Env, name: LimitName, key: string): Promise<string> {
  // Keyed with the auth secret, so read access to D1 cannot test known emails against a bucket.
  const data = new TextEncoder().encode(`${authSettings(env).secret}\0${name}\0${key}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface LimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Counts one attempt. One atomic upsert per bucket, so concurrent attempts cannot share a count. */
export async function consumeLimit(env: Env, name: LimitName, key: string): Promise<LimitResult> {
  const { attempts, windowSeconds } = LIMITS[name];
  const now = Date.now();
  const expired = now - windowSeconds * 1000;
  const table = schema.rate_limits;
  const [row] = await getDb(env)
    .insert(table)
    .values({ bucket: await bucketOf(env, name, key), window_started_at: now, attempts: 1 })
    .onConflictDoUpdate({
      target: table.bucket,
      set: {
        attempts: sql`case when ${table.window_started_at} <= ${expired} then 1 else ${table.attempts} + 1 end`,
        window_started_at: sql`case when ${table.window_started_at} <= ${expired} then ${now} else ${table.window_started_at} end`,
      },
    })
    .returning({ attempts: table.attempts });
  return { allowed: (row?.attempts ?? attempts + 1) <= attempts, retryAfterSeconds: windowSeconds };
}

/** Removes counters whose window has ended. Called from the scheduled handler. */
export async function pruneLimits(env: Env): Promise<void> {
  const longest = Math.max(...Object.values(LIMITS).map((limit) => limit.windowSeconds));
  await getDb(env)
    .delete(schema.rate_limits)
    .where(lt(schema.rate_limits.window_started_at, Date.now() - longest * 1000));
}

/** The client's address as Cloudflare reports it. One IPv6 customer holds a /64, so that is the unit. */
export function clientAddress(request: Request): string {
  const raw = request.headers.get("cf-connecting-ip")?.trim().toLowerCase() ?? "";
  if (!raw) return "unknown";
  if (!raw.includes(":")) return raw;
  if (raw.includes(".")) return raw.slice(raw.lastIndexOf(":") + 1);
  const [head = "", tail] = raw.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = raw.includes("::")
    ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right]
    : left;
  return `${groups
    .slice(0, 4)
    .map((group) => group.padStart(4, "0"))
    .join(":")}::/64`;
}

/** The block one customer or small provider usually holds, for limits an address cannot dodge by moving. */
export function clientNetwork(request: Request): string {
  const address = clientAddress(request);
  if (address === "unknown") return address;
  return address.includes(":")
    ? `${address.split(":").slice(0, 3).join(":")}::/48`
    : `${address.split(".").slice(0, 3).join(".")}.0/24`;
}
