// Accounts, proven on the Workers runtime: who may sign up, which sign-in routes exist and
// how they are limited, sessions, deleting an account, and what admins can do.
import { beforeAll, describe, expect, it } from "vitest";
import { ADMIN_EMAIL, Browser, env, mailedCode, migrate, signIn } from "./harness";
import type { ProductName } from "./products";

beforeAll(migrate);

const requestCode = (browser: Browser, email: string) =>
  browser.post("/api/auth/email-otp/send-verification-otp", { email, type: "sign-in" });

describe("who may create an account", () => {
  /** Asks for a code as a new person under `product`. True when an account can result. */
  async function canSignUp(product: ProductName, email: string): Promise<boolean> {
    const browser = new Browser({ product });
    const sent = await requestCode(browser, email);
    // The answer never says whether the address was accepted.
    expect(sent.status).toBe(200);
    expect(await sent.json()).toEqual({ success: true });
    const code = await mailedCode(email);
    if (!code) return false;
    return (await browser.post("/api/auth/sign-in/email-otp", { email, otp: code })).status === 200;
  }

  it("open: anyone", async () => {
    expect(await canSignUp("public-product", "anyone@elsewhere.example")).toBe(true);
  });

  it("closed: nobody new, and no mail is sent", async () => {
    expect(await canSignUp("signup-closed", "new-closed@example.com")).toBe(false);
  });

  it("allowlist: only addresses in SIGNUP_ALLOWLIST", async () => {
    expect(await canSignUp("signup-allowlist", "stranger@example.com")).toBe(false);
    expect(await canSignUp("signup-allowlist", "Invited@Example.com")).toBe(true);
  });

  it("domain: only addresses at the configured domains", async () => {
    expect(await canSignUp("signup-domain", "someone@other.example")).toBe(false);
    expect(await canSignUp("signup-domain", "someone@corp.example.evil.example")).toBe(false);
    expect(await canSignUp("signup-domain", "someone@corp.example")).toBe(true);
  });

  it("never stops an existing account signing in", async () => {
    const { userId } = await signIn("existing@example.com");
    const again = await signIn("existing@example.com", new Browser({ product: "signup-closed" }));
    expect(again.userId).toBe(userId);
  });
});

describe("sign-in routes", () => {
  it("exist only when listed: the rest of Better Auth is unreachable", async () => {
    const browser = new Browser();
    for (const [method, path] of [
      ["POST", "/api/auth/sign-up/email"],
      ["POST", "/api/auth/sign-in/email"],
      ["POST", "/api/auth/admin/list-users"],
      ["GET", "/api/auth/admin/list-users"],
      ["POST", "/api/auth/admin/set-role"],
      ["POST", "/api/auth/change-email"],
      ["POST", "/api/auth/delete-user"],
      ["GET", "/api/auth/sign-out"],
    ] as const) {
      const response = method === "POST" ? await browser.post(path, {}) : await browser.fetch(path);
      expect(response.status, `${method} ${path}`).toBe(404);
    }
  });

  it("offer Google and Apple only when the product turns them on", async () => {
    const off = await new Browser().post("/api/auth/sign-in/social", { provider: "google" });
    expect(off.status).toBe(404);
    const on = new Browser({ product: "social-sign-in" });
    expect(await (await on.fetch("/health")).json()).toMatchObject({
      signIn: { emailCode: true, google: true, apple: true },
    });
    const google = await on.post("/api/auth/sign-in/social", { provider: "google" });
    expect(google.status).toBe(200);
    expect(((await google.json()) as { url: string }).url).toContain("accounts.google.com");
    const apple = await on.post("/api/auth/sign-in/social", { provider: "apple" });
    expect(((await apple.json()) as { url: string }).url).toContain("appleid.apple.com");
  });

  it("take Apple's callback as a form POST from Apple's own site", async () => {
    const response = await new Browser({ product: "social-sign-in" }).fetch("/api/auth/callback/apple", {
      method: "POST",
      headers: { origin: "https://appleid.apple.com", "content-type": "application/x-www-form-urlencoded" },
      body: "state=abc&code=xyz",
    });
    // Better Auth carries the form on as a GET to itself; the router did not refuse it.
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/api/auth/callback/apple?");
  });

  it("limit how many codes one address can be sent", async () => {
    const email = "flooded@example.com";
    const statuses: number[] = [];
    // Each request from a new client address, so only the per-email limit is in play.
    for (let i = 0; i < 7; i++) statuses.push((await requestCode(new Browser(), email)).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429, 429]);
  });

  it("limit how many codes one client can ask for, whoever they are for", async () => {
    const browser = new Browser();
    const statuses: number[] = [];
    for (let i = 0; i < 22; i++) statuses.push((await requestCode(browser, `victim-${i}@example.com`)).status);
    expect(statuses.slice(0, 20).every((status) => status === 200)).toBe(true);
    expect(statuses.slice(20)).toEqual([429, 429]);
    const refused = await requestCode(browser, "one-more@example.com");
    expect(refused.headers.get("retry-after")).toBe("900");
  });

  it("keep limit counters under a keyed hash, not the address or email", async () => {
    await requestCode(new Browser(), "hashed-bucket@example.com");
    const rows = await env.DB.prepare("select bucket from rate_limits").all<{ bucket: string }>();
    expect(rows.results.length).toBeGreaterThan(0);
    for (const row of rows.results) expect(row.bucket).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("sessions", () => {
  it("lists where the person is signed in, without the session secrets", async () => {
    const phone = await signIn("two-devices@example.com");
    const laptop = await signIn("two-devices@example.com");
    const response = await laptop.browser.fetch("/api/account/sessions");
    const text = await response.text();
    const { sessions } = JSON.parse(text) as { sessions: { id: string; current: boolean }[] };
    expect(sessions).toHaveLength(2);
    expect(sessions.filter((item) => item.current)).toHaveLength(1);
    expect(text).not.toContain("token");
    expect(phone.userId).toBe(laptop.userId);
  });

  it("ends one session and leaves the other", async () => {
    const phone = await signIn("revoker@example.com");
    const laptop = await signIn("revoker@example.com");
    const list = (await (await laptop.browser.fetch("/api/account/sessions")).json()) as {
      sessions: { id: string; current: boolean }[];
    };
    const other = list.sessions.find((item) => !item.current);
    expect((await laptop.browser.post("/api/account/sessions/revoke", { id: other?.id })).status).toBe(200);
    expect((await phone.browser.fetch("/api/account/whoami")).status).toBe(401);
    expect((await laptop.browser.fetch("/api/account/whoami")).status).toBe(200);
  });

  it("cannot end someone else's session", async () => {
    const victim = await signIn("victim@example.com");
    const attacker = await signIn("attacker@example.com");
    const list = (await (await victim.browser.fetch("/api/account/sessions")).json()) as { sessions: { id: string }[] };
    await attacker.browser.post("/api/account/sessions/revoke", { id: list.sessions[0]?.id });
    expect((await victim.browser.fetch("/api/account/whoami")).status).toBe(200);
  });
});

describe("deleting an account", () => {
  const confirm = { confirm: "delete my account" };

  it("removes the account and ends its sessions", async () => {
    const { browser } = await signIn("leaver@example.com");
    expect((await browser.post("/api/account/delete", confirm)).status).toBe(200);
    expect((await browser.fetch("/api/account/whoami")).status).toBe(401);
    const row = await env.DB.prepare("select id from auth_user where email = ?").bind("leaver@example.com").first();
    expect(row).toBeNull();
  });

  it("needs the exact confirmation", async () => {
    const { browser } = await signIn("careful@example.com");
    expect((await browser.post("/api/account/delete", { confirm: "yes" })).status).toBe(400);
    expect((await browser.fetch("/api/account/whoami")).status).toBe(200);
  });

  it("needs a sign-in from the last few minutes", async () => {
    const { browser, userId } = await signIn("stale@example.com");
    const anHourAgo = Date.now() - 60 * 60 * 1000;
    await env.DB.prepare("update auth_session set created_at = ? where user_id = ?").bind(anHourAgo, userId).run();
    const response = await browser.post("/api/account/delete", confirm);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ data: { reason: "fresh_sign_in_required" } });
    expect((await browser.fetch("/api/account/whoami")).status).toBe(200);
  });
});

describe("admins", () => {
  const admin = new Browser({ accessEmail: ADMIN_EMAIL });

  it("list accounts, newest first, a page at a time", async () => {
    await signIn("listed-a@example.com");
    await signIn("listed-b@example.com");
    const first = (await (await admin.fetch("/api/admin/users?limit=1")).json()) as {
      users: { email: string }[];
      next: string | null;
    };
    expect(first.users).toHaveLength(1);
    expect(first.next).toBeTruthy();
    const second = (await (await admin.fetch(`/api/admin/users?limit=1&before=${first.next}`)).json()) as {
      users: { email: string }[];
    };
    expect(second.users[0]?.email).not.toBe(first.users[0]?.email);
  });

  it("ban an account: it is signed out everywhere and cannot sign in again", async () => {
    const { browser, userId } = await signIn("troublemaker@example.com");
    expect((await admin.post("/api/admin/users/ban", { userId, banned: true })).status).toBe(200);
    expect((await browser.fetch("/api/account/whoami")).status).toBe(401);
    await expect(signIn("troublemaker@example.com")).rejects.toThrow(/Sign-in failed/);

    expect((await admin.post("/api/admin/users/ban", { userId, banned: false })).status).toBe(200);
    expect((await signIn("troublemaker@example.com")).userId).toBe(userId);
  });

  it("ban an account that signs in through Cloudflare Access", async () => {
    const member = new Browser({ product: "private", accessEmail: "ex-colleague@example.com" });
    const { id } = (await (await member.fetch("/api/account/whoami")).json()) as { id: string };
    await admin.post("/api/admin/users/ban", { userId: id, banned: true });
    expect((await member.fetch("/api/account/whoami")).status).toBe(401);
  });

  it("cannot ban themselves", async () => {
    const { id } = (await (await admin.as({ product: "private" }).fetch("/api/account/whoami")).json()) as {
      id: string;
    };
    expect((await admin.post("/api/admin/users/ban", { userId: id, banned: true })).status).toBe(400);
  });

  it("are only people Access verified whose email is in ADMIN_EMAILS", async () => {
    const colleague = new Browser({ accessEmail: "colleague@example.com" });
    expect((await colleague.fetch("/api/admin/users")).status).toBe(404);
    // A session for the admin's email, made outside Access, is not an admin either.
    const { browser } = await signIn(ADMIN_EMAIL);
    expect((await browser.fetch("/api/admin/users")).status).toBe(404);
  });
});

describe("odd sign-in paths", () => {
  it("are not routes, whatever JavaScript objects happen to have", async () => {
    for (const path of ["/api/auth/constructor", "/api/auth/__proto__", "/api/auth/toString", "/api/auth"]) {
      expect((await new Browser().fetch(path)).status, path).toBe(404);
    }
  });
});
