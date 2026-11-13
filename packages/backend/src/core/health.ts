// What /health reports: which build is running and which optional features are configured.
// Nothing here is secret; the endpoint is public so a deploy can be checked from outside.
import type { Env } from "../env";

export interface Health {
  ok: true;
  env: string;
  version: string;
  /** "on" sends through Cloudflare Email Service; "outbox" writes to the email_outbox table. */
  email: "on" | "outbox";
}

export function health(env: Env): Health {
  return {
    ok: true,
    env: env.APP_ENV,
    version: env.CF_VERSION_METADATA?.id || "dev",
    email: env.EMAIL && env.EMAIL_FROM ? "on" : "outbox",
  };
}
