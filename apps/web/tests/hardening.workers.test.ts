// The Worker's general protections, proven on the Workers runtime: response headers and the
// script nonce, request size, the edge rate limit, Turnstile, mail caps and the daily clean-up.
import { authGate, type Env, runScheduled, secured, sendEmail } from "@app/backend";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Browser, env, migrate, ORIGIN, signIn } from "./harness";
import { PRODUCTS } from "./products";

beforeAll(migrate);
afterEach(() => vi.restoreAllMocks());

describe("response headers", () => {
  it("are on every kind of answer: a page, JSON, a refusal, an error", async () => {
    const browser = new Browser();
    const answers = [
      await browser.page("/pricing"),
      await browser.fetch("/api/ping"),
      await browser.fetch("/health"),
      await browser.fetch("/admin/users"),
      await browser.fetch("/rpc/system/ping", {
        method: "POST",
        headers: { origin: "https://evil.example" },
        body: "{}",
      }),
      await browser.fetch("https://product.example/"),
    ];
    expect(answers.map((response) => response.status)).toEqual([200, 200, 200, 404, 403, 500]);
    for (const response of answers) {
      const status = String(response.status);
      expect(response.headers.get("x-content-type-options"), status).toBe("nosniff");
      expect(response.headers.get("x-frame-options"), status).toBe("DENY");
      expect(response.headers.get("referrer-policy"), status).toBe("strict-origin-when-cross-origin");
      expect(response.headers.get("content-security-policy"), status).toContain("frame-ancestors 'none'");
      await response.body?.cancel();
    }
  });

  it("give a page a fresh nonce, on the policy and on each of its scripts", async () => {
    const first = await new Browser().page("/pricing");
    const policy = first.headers.get("content-security-policy") ?? "";
    const nonce = /script-src 'self' 'nonce-([^']+)'/.exec(policy)?.[1];
    expect(nonce).toBeTruthy();
    const html = await first.text();
    expect(html.match(/<script /g)).toHaveLength(2);
    expect(html.split(`nonce="${nonce}"`)).toHaveLength(3);
    expect(policy).toContain("object-src 'none'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(first.headers.get("cache-control")).toBe("no-cache");

    const second = await new Browser().page("/pricing");
    expect(second.headers.get("content-security-policy")).not.toBe(policy);
    await second.body?.cancel();
  });

  it("let nothing load from an answer that is not a page", async () => {
    const response = await new Browser().fetch("/api/ping");
    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    );
  });

  // >>> mcp
  it("keep a handler's own policy when it sets one", async () => {
    const response = await new Browser().fetch("/authorize", { method: "POST", headers: { origin: ORIGIN } });
    await response.body?.cancel();
    const { browser } = await signIn("csp-keeper@example.com");
    const handoff = await browser.postForm("/authorize", [
      ["handle", "unknown"],
      ["decision", "approve"],
    ]);
    expect(handoff.status).toBe(400);
    expect(handoff.headers.get("content-security-policy")).toContain("default-src 'none'; style-src 'unsafe-inline'");
    expect(handoff.headers.get("x-frame-options")).toBe("DENY");
  });
  // <<< mcp

  it("keep everything out of search engines except the public site on the product's own domain", () => {
    const request = new Request("https://product.example/pricing");
    const page = () => new Response("<html></html>", { headers: { "content-type": "text/html" } });
    const hidden = secured(request, page(), env, { indexable: false });
    expect(hidden.headers.get("x-robots-tag")).toContain("noindex");
    const shown = secured(request, page(), env, { indexable: true });
    expect(shown.headers.get("x-robots-tag")).toBeNull();
    expect(shown.headers.get("strict-transport-security")).toContain("max-age=31536000");
    expect(shown.headers.get("content-security-policy")).toContain("upgrade-insecure-requests");
  });

  it("allow eval only on a developer machine, where React's development build needs it", () => {
    const request = new Request("http://localhost/app");
    const page = () => new Response("<html></html>", { headers: { "content-type": "text/html" } });
    const policy = (appEnv: string) =>
      secured(request, page(), { ...env, APP_ENV: appEnv }, { indexable: false }).headers.get(
        "content-security-policy",
      );
    expect(policy("local")).toContain("'unsafe-eval'");
    for (const deployed of ["production", "staging", "test"]) expect(policy(deployed)).not.toContain("'unsafe-eval'");
  });

  it("report the running build", async () => {
    const response = await new Browser({ product: "private" }).fetch("/__build");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: expect.any(String) });
  });
});

describe("request size", () => {
  it("refuses a body that says it is over the limit", async () => {
    const response = await new Browser().fetch("/rpc/system/ping", {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json", "content-length": String(2 * 1024 * 1024) },
      body: "{}",
    });
    expect(response.status).toBe(413);
  });

  it("stops reading a body with no declared size once it passes the limit", async () => {
    const chunk = new Uint8Array(256 * 1024).fill(0x20);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent++ < 8) controller.enqueue(chunk);
        else controller.close();
      },
    });
    const response = await new Browser().fetch("/rpc/account/sessions/revoke", {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit);
    expect(response.status).toBeGreaterThanOrEqual(400);
    await response.body?.cancel();
  });
});

describe("the edge rate limit", () => {
  it("stops one client hammering the API, and only that client", async () => {
    const heavy = new Browser();
    const statuses: number[] = [];
    for (let i = 0; i < 320; i++) {
      const response = await heavy.fetch("/api/ping");
      statuses.push(response.status);
      await response.body?.cancel();
    }
    expect(statuses.slice(0, 250).every((status) => status === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
    expect((await new Browser().fetch("/api/ping")).status).toBe(200);
  });
});

describe("Turnstile", () => {
  const on: Env = {
    ...env,
    PRODUCT: PRODUCTS["public-product"],
    TURNSTILE_SITE_KEY: "site-key",
    TURNSTILE_SECRET_KEY: "secret-key",
  };
  const codeRequest = (token?: string) =>
    new Request(`${ORIGIN}/api/auth/email-otp/send-verification-otp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": `203.0.113.${Math.floor(Math.random() * 250)}`,
        ...(token ? { "x-turnstile-token": token } : {}),
      },
      body: JSON.stringify({ email: `turnstile-${crypto.randomUUID()}@example.com`, type: "sign-in" }),
    });
  const cloudflareSays = (success: boolean) =>
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ success }));

  it("is off until both keys are set", async () => {
    const check = cloudflareSays(false);
    expect(await authGate(codeRequest(), { ...on, TURNSTILE_SECRET_KEY: undefined }, "/api/auth")).toBeNull();
    expect(check).not.toHaveBeenCalled();
  });

  it("refuses a code request with no token, without asking Cloudflare", async () => {
    const check = cloudflareSays(true);
    expect((await authGate(codeRequest(), on, "/api/auth"))?.status).toBe(403);
    expect(check).not.toHaveBeenCalled();
  });

  it("lets a code request through when Cloudflare confirms the token, sending the secret and the token", async () => {
    const check = cloudflareSays(true);
    expect(await authGate(codeRequest("good-token"), on, "/api/auth")).toBeNull();
    const [url, init] = check.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const sent = new URLSearchParams(String((init as RequestInit).body));
    expect(sent.get("secret")).toBe("secret-key");
    expect(sent.get("response")).toBe("good-token");
  });

  it("refuses when Cloudflare rejects the token or cannot be reached", async () => {
    cloudflareSays(false);
    expect((await authGate(codeRequest("bad-token"), on, "/api/auth"))?.status).toBe(403);
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    expect((await authGate(codeRequest("any-token"), on, "/api/auth"))?.status).toBe(403);
  });

  it("does not gate the other sign-in routes", async () => {
    const check = cloudflareSays(false);
    const session = new Request(`${ORIGIN}/api/auth/get-session`, { headers: { "cf-connecting-ip": "203.0.113.251" } });
    expect(await authGate(session, on, "/api/auth")).toBeNull();
    expect(check).not.toHaveBeenCalled();
  });
});

describe("mail caps", () => {
  it("stop one address being sent more than its daily share", async () => {
    const message = { to: "Capped@Example.com", subject: "Hello", text: "Hello" };
    for (let i = 0; i < 10; i++) expect(await sendEmail(env, message)).toBe("outbox");
    await expect(sendEmail(env, message)).rejects.toMatchObject({ status: 429, code: "email_cap_reached" });
    // Someone else's mail still goes.
    expect(await sendEmail(env, { ...message, to: "other-recipient@example.com" })).toBe("outbox");
  });

  it("never store mail when a deployed build has no sender", async () => {
    const deployed: Env = { ...env, APP_ENV: "production" };
    await expect(sendEmail(deployed, { to: "nobody@example.com", subject: "s", text: "t" })).rejects.toMatchObject({
      status: 503,
    });
    const row = await env.DB.prepare("select id from email_outbox where recipient = ?")
      .bind("nobody@example.com")
      .first();
    expect(row).toBeNull();
  });
});

describe("the daily clean-up", () => {
  it("removes what has expired and nothing else", async () => {
    const { browser, userId } = await signIn("tidy@example.com");
    const past = Date.now() - 60_000;
    await env.DB.batch([
      env.DB.prepare(
        "insert into auth_session (id, expires_at, token, created_at, updated_at, user_id) values ('expired-session', ?, 'expired-token', ?, ?, ?)",
      ).bind(past, past, past, userId),
      env.DB.prepare(
        "insert into auth_verification (id, identifier, value, expires_at, created_at, updated_at) values ('expired-code', 'x', 'y', ?, ?, ?)",
      ).bind(past, past, past),
      // >>> mcp
      env.DB.prepare(
        "insert into consent_identity (handle_hash, user_id, client_name, redirect_host, scope, expires_at) values ('expired-consent', ?, 'c', 'h', '[]', ?)",
      ).bind(userId, Math.floor(past / 1000)),
      // <<< mcp
      env.DB.prepare("insert into rate_limits (bucket, window_started_at, attempts) values ('old-bucket', ?, 3)").bind(
        Date.now() - 2 * 86_400_000,
      ),
    ]);

    await runScheduled(env);

    const count = async (sql: string) => (await env.DB.prepare(sql).first<{ n: number }>())?.n;
    expect(await count("select count(*) as n from auth_session where id = 'expired-session'")).toBe(0);
    expect(await count("select count(*) as n from auth_verification where id = 'expired-code'")).toBe(0);
    // >>> mcp
    expect(await count("select count(*) as n from consent_identity where handle_hash = 'expired-consent'")).toBe(0);
    // <<< mcp
    expect(await count("select count(*) as n from rate_limits where bucket = 'old-bucket'")).toBe(0);
    // The live session survives.
    expect((await browser.fetch("/api/account/whoami")).status).toBe(200);
  });
});
