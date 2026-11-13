// The one place mail leaves the app. Everything that sends goes through sendEmail().

import { UserError } from "../../core/errors";
import { isLocalRun } from "../../core/runtime";
import { getDb, schema } from "../../db/client";
import type { Env } from "../../env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  /** Plain text. The app sends no HTML mail. */
  text: string;
}

/** True when real mail can be sent: the Email Service binding and a sender address are both set. */
export function emailConfigured(env: Pick<Env, "EMAIL" | "EMAIL_FROM">): boolean {
  return Boolean(env.EMAIL && env.EMAIL_FROM);
}

/** "on": real mail. "outbox": the local table. "off": a deployed build with no sending domain. */
export function emailMode(env: Pick<Env, "EMAIL" | "EMAIL_FROM" | "APP_ENV">): "on" | "outbox" | "off" {
  if (emailConfigured(env)) return "on";
  return isLocalRun(env) ? "outbox" : "off";
}

/**
 * Sends through Cloudflare Email Service when configured. On local and test runs with no
 * sender, the message is stored in the outbox table instead, which is how sign-in is
 * completed without real mail. A deployed build never does that: an outbox row holds the
 * sign-in code in plain text, so there the send is refused.
 */
export async function sendEmail(env: Env, message: OutgoingEmail): Promise<"sent" | "outbox"> {
  const mode = emailMode(env);
  if (mode === "on") {
    await env.EMAIL!.send({ from: env.EMAIL_FROM!, to: message.to, subject: message.subject, text: message.text });
    return "sent";
  }
  if (mode === "off") throw new UserError(503, "email_unavailable", "Email sign-in is not set up yet.");
  await getDb(env)
    .insert(schema.email_outbox)
    .values({ recipient: message.to, subject: message.subject, body: message.text });
  return "outbox";
}
