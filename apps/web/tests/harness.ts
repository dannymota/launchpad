/// <reference types="@cloudflare/vitest-plugin/types" />
// Shared by the Workers-runtime tests: the Worker under test, a cookie jar, and sign-in.

import { applyD1Migrations } from "cloudflare:test";
import { exports, env as workerEnv } from "cloudflare:workers";
import type { Env } from "@app/backend";
import type { D1Migration } from "@cloudflare/vitest-plugin";

export const ORIGIN = "http://localhost";
export const env = workerEnv as unknown as Env & { TEST_MIGRATIONS: D1Migration[] };
const worker = (exports as unknown as { default: { fetch(request: Request): Promise<Response> } }).default;

export async function migrate(): Promise<void> {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
}

/** One browser: it keeps the cookies it is given and sends them back, as a browser would. */
export class Browser {
  private readonly cookies = new Map<string, string>();

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    // A real request always names its host; the MCP handler refuses one that does not.
    headers.set("host", new URL(ORIGIN).host);
    if (this.cookies.size)
      headers.set("cookie", [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; "));
    const response = await worker.fetch(new Request(ORIGIN + path, { ...init, headers, redirect: "manual" }));
    for (const line of response.headers.getSetCookie()) {
      const [pair = "", ...attributes] = line.split(";");
      const name = pair.slice(0, pair.indexOf("=")).trim();
      if (attributes.some((item) => /^\s*max-age=0\s*$/i.test(item))) this.cookies.delete(name);
      else this.cookies.set(name, pair.slice(pair.indexOf("=") + 1).trim());
    }
    return response;
  }

  /** A JSON POST from this site's own pages. */
  post(path: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
    return this.fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
      body: JSON.stringify(body),
    });
  }

  /** A form POST from this site's own pages. */
  postForm(path: string, fields: [string, string][], origin = ORIGIN): Promise<Response> {
    return this.fetch(path, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", origin },
      body: new URLSearchParams(fields),
    });
  }
}

/** The newest sign-in code mailed to `email`, read from the local outbox. */
export async function mailedCode(email: string): Promise<string> {
  const row = await env.DB.prepare("select subject from email_outbox where recipient = ? order by id desc limit 1")
    .bind(email)
    .first<{ subject: string }>();
  const code = /\d{6}/.exec(row?.subject ?? "")?.[0];
  if (!code) throw new Error(`No sign-in code was mailed to ${email}`);
  return code;
}

/** Signs a new browser in with an emailed code and returns it with the account's id. */
export async function signIn(email: string): Promise<{ browser: Browser; userId: string }> {
  const browser = new Browser();
  const sent = await browser.post("/api/auth/email-otp/send-verification-otp", { email, type: "sign-in" });
  if (sent.status !== 200) throw new Error(`Sending a code failed: ${sent.status} ${await sent.text()}`);
  const response = await browser.post("/api/auth/sign-in/email-otp", { email, otp: await mailedCode(email) });
  if (response.status !== 200) throw new Error(`Sign-in failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as { user: { id: string } };
  return { browser, userId: body.user.id };
}
