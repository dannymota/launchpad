// What /health reports: which build is running and which optional features are configured.
// Nothing here is secret; the endpoint is public so a deploy can be checked from outside.
import type { Env } from "../env";
import { emailMode } from "../integrations/email/sender";

export interface Health {
  ok: true;
  env: string;
  version: string;
  /** "on": real mail. "outbox": the local table. "off": no sending domain, so no email sign-in. */
  email: ReturnType<typeof emailMode>;
}

export function health(env: Env): Health {
  return {
    ok: true,
    env: env.APP_ENV,
    version: env.CF_VERSION_METADATA?.id || "dev",
    email: emailMode(env),
  };
}
