// The one place mail leaves the app. Everything that sends goes through sendEmail().

import { UserError } from "../../core/errors";
import { emailMode } from "../../core/runtime";
import { getDb, schema } from "../../db/client";
import type { Env } from "../../env";
import { consumeLimit } from "../../safety/limits";

export interface OutgoingEmail {
  to: string;
  subject: string;
  /** Plain text. The app sends no HTML mail. */
  text: string;
}

/**
 * Sends through Cloudflare Email Service when configured. On local and test runs with no
 * sender, the message is stored in the outbox table instead, which is how sign-in is
 * completed without real mail. A deployed build never does that: an outbox row holds the
 * sign-in code in plain text, so there the send is refused.
 */
export async function sendEmail(env: Env, message: OutgoingEmail): Promise<"sent" | "outbox"> {
  const mode = emailMode(env);
  if (mode === "off") throw new UserError(503, "email_unavailable", "Email sign-in is not set up yet.");
  // Counted before sending, in every mode, so the caps behave the same locally as deployed.
  const recipient = await consumeLimit(env, "emailRecipientDay", message.to.trim().toLowerCase());
  const total = recipient.allowed ? await consumeLimit(env, "emailTotalDay", "all") : recipient;
  if (!recipient.allowed || !total.allowed) {
    console.error(JSON.stringify({ event: "email_cap_reached", cap: recipient.allowed ? "total" : "recipient" }));
    throw new UserError(429, "email_cap_reached", "Too many emails for now. Try again tomorrow.");
  }
  if (mode === "on") {
    await env.EMAIL!.send({ from: env.EMAIL_FROM!, to: message.to, subject: message.subject, text: message.text });
    return "sent";
  }
  await getDb(env)
    .insert(schema.email_outbox)
    .values({ recipient: message.to, subject: message.subject, body: message.text });
  return "outbox";
}
