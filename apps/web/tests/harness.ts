/// <reference types="@cloudflare/vitest-plugin/types" />
// Shared by the Workers-runtime tests: the Worker under test, a browser with a cookie jar,
// Cloudflare Access tokens, and sign-in.

import { applyD1Migrations } from "cloudflare:test";
import { exports, env as workerEnv } from "cloudflare:workers";
import type { Env } from "@app/backend";
import type { D1Migration } from "@cloudflare/vitest-plugin";
import { importJWK, SignJWT } from "jose";
import { ENVIRONMENT_HEADER, type EnvironmentName, PRODUCT_HEADER, type ProductName } from "./products";

export const ORIGIN = "http://localhost";
export const ADMIN_EMAIL = "admin@example.com";
export const env = workerEnv as unknown as Env & { TEST_MIGRATIONS: D1Migration[]; TEST_ACCESS_PRIVATE_JWK: string };
const worker = (exports as unknown as { default: { fetch(request: Request): Promise<Response> } }).default;

export async function migrate(): Promise<void> {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
}

/** A token as Cloudflare Access would add it for `email`. Options make deliberately bad ones. */
export async function accessToken(
  email: string | null,
  options: { audience?: string; issuer?: string; expiresInSeconds?: number } = {},
): Promise<string> {
  const key = await importJWK(JSON.parse(env.TEST_ACCESS_PRIVATE_JWK), "RS256");
  const now = Math.floor(Date.now() / 1000);
  const claims = email ? { email } : { common_name: "service-token-client-id" };
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(options.issuer ?? `https://${env.ACCESS_TEAM_DOMAIN}`)
    .setAudience(options.audience ?? "test-audience-two")
    .setSubject(email ? `subject-of-${email}` : "")
    .setIssuedAt(now)
    .setExpirationTime(now + (options.expiresInSeconds ?? 300))
    .sign(key);
}

let nextAddress = 1;

export interface BrowserOptions {
  /** Which product config the Worker runs with. Default: a launched product with open signup. */
  product?: ProductName;
  /** Extra settings to switch on for this browser's requests (tests/products.ts). */
  environment?: EnvironmentName;
  /** Come through Cloudflare Access as this email. */
  accessEmail?: string;
  /** Or with this exact token, to try ones Access would never issue. */
  accessJwt?: string;
}

/** One browser: it keeps the cookies it is given and sends them back, as a browser would. */
export class Browser {
  private readonly cookies = new Map<string, string>();
  // Its own address, so one test's attempts never count against another's limits.
  readonly address = `198.51.100.${nextAddress++ % 250}`;
  private token: Promise<string | null> | null = null;

  constructor(private readonly options: BrowserOptions = {}) {}

  /** The same browser (cookies and address), seen through another product config or Access identity. */
  as(options: BrowserOptions): Browser {
    const other = new Browser({ ...this.options, ...options });
    for (const [name, value] of this.cookies) other.cookies.set(name, value);
    Object.assign(other, { address: this.address });
    return other;
  }

  private accessJwt(): Promise<string | null> {
    this.token ??= this.options.accessJwt
      ? Promise.resolve(this.options.accessJwt)
      : this.options.accessEmail
        ? accessToken(this.options.accessEmail)
        : Promise.resolve(null);
    return this.token;
  }

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    // A real request always names its host; the MCP handler refuses one that does not.
    headers.set("host", new URL(ORIGIN).host);
    if (!headers.has("cf-connecting-ip")) headers.set("cf-connecting-ip", this.address);
    if (this.options.product) headers.set(PRODUCT_HEADER, this.options.product);
    if (this.options.environment) headers.set(ENVIRONMENT_HEADER, this.options.environment);
    const jwt = await this.accessJwt();
    if (jwt) headers.set("cf-access-jwt-assertion", jwt);
    if (this.cookies.size)
      headers.set("cookie", [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; "));
    const url = path.startsWith("http") ? path : ORIGIN + path;
    const response = await worker.fetch(new Request(url, { ...init, headers, redirect: "manual" }));
    for (const line of response.headers.getSetCookie()) {
      const [pair = "", ...attributes] = line.split(";");
      const name = pair.slice(0, pair.indexOf("=")).trim();
      if (attributes.some((item) => /^\s*max-age=0\s*$/i.test(item))) this.cookies.delete(name);
      else this.cookies.set(name, pair.slice(pair.indexOf("=") + 1).trim());
    }
    return response;
  }

  /** A page view: a GET that says it wants HTML. */
  page(path: string): Promise<Response> {
    return this.fetch(path, { headers: { accept: "text/html,application/xhtml+xml" } });
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

/** The newest sign-in code mailed to `email`, read from the local outbox. Null when none was sent. */
export async function mailedCode(email: string): Promise<string | null> {
  const row = await env.DB.prepare("select subject from email_outbox where recipient = ? order by id desc limit 1")
    // Addresses are stored lowercased, however the person typed them.
    .bind(email.toLowerCase())
    .first<{ subject: string }>();
  return /\d{6}/.exec(row?.subject ?? "")?.[0] ?? null;
}

/** Signs a browser in with an emailed code and returns it with the account's id. */
export async function signIn(email: string, browser = new Browser()): Promise<{ browser: Browser; userId: string }> {
  const sent = await browser.post("/api/auth/email-otp/send-verification-otp", { email, type: "sign-in" });
  if (sent.status !== 200) throw new Error(`Sending a code failed: ${sent.status} ${await sent.text()}`);
  const code = await mailedCode(email);
  if (!code) throw new Error(`No sign-in code was mailed to ${email}`);
  const response = await browser.post("/api/auth/sign-in/email-otp", { email, otp: code });
  if (response.status !== 200) throw new Error(`Sign-in failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as { user: { id: string } };
  return { browser, userId: body.user.id };
}
