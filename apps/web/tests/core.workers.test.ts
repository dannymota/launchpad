// The core of the template, proven on the Workers runtime: the router's order, sign-in with
// an emailed code, and one procedure answering over both HTTP transports.
import { beforeAll, describe, expect, it } from "vitest";
import { Browser, migrate, ORIGIN, signIn } from "./harness";

beforeAll(migrate);

describe("router", () => {
  it("reports health without a session", async () => {
    const response = await new Browser().fetch("/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, env: "test", email: "outbox" });
  });

  it("hands other paths to the page renderer with this request's origin", async () => {
    const response = await new Browser().fetch("/anything", { headers: { "x-app-origin": "https://evil.example" } });
    expect(await response.text()).toContain(JSON.stringify({ page: "/anything", origin: ORIGIN }));
  });

  it("never sends an API or sign-in path to the page renderer", async () => {
    for (const path of ["/api/nope", "/rpc/nope", "/api", "/rpc"]) {
      const response = await new Browser().fetch(path);
      expect(response.status, path).toBe(404);
      expect(await response.json(), path).toMatchObject({ code: "NOT_FOUND" });
    }
    const auth = await new Browser().fetch("/api/auth/nope");
    expect(auth.status).toBe(404);
    expect(await auth.text()).not.toContain('"page"');
  });
});

describe("cross-site writes", () => {
  const from = (origin: string) => ({ origin, "content-type": "application/json" });

  it("are refused for the API and for sign-in", async () => {
    const paths = [
      "/rpc/system/ping",
      "/api/auth/sign-out",
      "/api/auth/sign-in/email-otp",
      // >>> mcp
      "/authorize",
      // <<< mcp
    ];
    for (const path of paths) {
      const response = await new Browser().fetch(path, {
        method: "POST",
        headers: from("https://evil.example"),
        body: "{}",
      });
      expect(response.status, path).toBe(403);
    }
  });

  it("are refused from a sibling host that sends no Origin", async () => {
    const response = await new Browser().fetch("/rpc/system/ping", {
      method: "POST",
      headers: { "sec-fetch-site": "same-site", "content-type": "application/json" },
      body: "{}",
    });
    expect(response.status).toBe(403);
  });

  it("are accepted where the protocol needs them: Apple's callback and the OAuth machine endpoints", async () => {
    const apple = await new Browser().fetch("/api/auth/callback/apple", {
      method: "POST",
      headers: { origin: "https://appleid.apple.com", "content-type": "application/x-www-form-urlencoded" },
      body: "state=abc&code=xyz",
    });
    expect(apple.status).not.toBe(403);
    // >>> mcp
    for (const path of ["/oauth/token", "/oauth/register", "/mcp"]) {
      const response = await new Browser().fetch(path, {
        method: "POST",
        headers: from("https://assistant.example"),
        body: "{}",
      });
      expect(response.status, path).not.toBe(403);
    }
    // <<< mcp
  });

  it("do not stop reads", async () => {
    const response = await new Browser().fetch("/api/ping", { headers: { origin: "https://evil.example" } });
    expect(response.status).toBe(200);
  });
});

describe("the API", () => {
  it("answers one procedure over /rpc and over /api", async () => {
    const browser = new Browser();
    const rpc = await browser.post("/rpc/system/ping", {});
    expect(rpc.status).toBe(200);
    expect(await rpc.json()).toMatchObject({ json: { ok: true } });
    const rest = await browser.fetch("/api/ping");
    expect(rest.status).toBe(200);
    expect(await rest.json()).toMatchObject({ ok: true });
  });

  it("refuses a signed-in procedure without a session", async () => {
    const response = await new Browser().fetch("/api/account/whoami");
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("email-code sign-in", () => {
  it("signs in with the mailed code and identifies the person on both transports", async () => {
    const { browser, userId } = await signIn("ada@example.com");
    const rest = await browser.fetch("/api/account/whoami");
    expect(await rest.json()).toEqual({ id: userId, email: "ada@example.com", name: "" });
    const rpc = await browser.post("/rpc/account/whoami", {});
    expect(await rpc.json()).toEqual({ json: { id: userId, email: "ada@example.com", name: "" } });
  });

  it("gives the same account on a second sign-in", async () => {
    const first = await signIn("grace@example.com");
    const second = await signIn("grace@example.com");
    expect(second.userId).toBe(first.userId);
  });

  it("refuses a wrong code", async () => {
    const browser = new Browser();
    await browser.post("/api/auth/email-otp/send-verification-otp", { email: "wrong@example.com", type: "sign-in" });
    const response = await browser.post("/api/auth/sign-in/email-otp", { email: "wrong@example.com", otp: "000000" });
    expect(response.status).toBe(400);
    expect((await browser.fetch("/api/account/whoami")).status).toBe(401);
  });

  it("ends the session on sign-out", async () => {
    const { browser } = await signIn("out@example.com");
    expect((await browser.post("/api/auth/sign-out", {})).status).toBe(200);
    expect((await browser.fetch("/api/account/whoami")).status).toBe(401);
  });

  it("stores the code hashed, never in the clear", async () => {
    const { env, mailedCode } = await import("./harness");
    await new Browser().post("/api/auth/email-otp/send-verification-otp", {
      email: "hash@example.com",
      type: "sign-in",
    });
    const code = await mailedCode("hash@example.com");
    const rows = await env.DB.prepare("select identifier, value from auth_verification").all<{
      identifier: string;
      value: string;
    }>();
    expect(rows.results.length).toBeGreaterThan(0);
    for (const row of rows.results) {
      expect(row.value).not.toContain(code);
      expect(row.identifier).not.toContain("hash@example.com");
    }
  });
});
