// The analytics module, proven on the Workers runtime with PostHog stood in for: /ingest
// exists only once a key is set, and what it passes on carries nothing that identifies the
// visitor's account.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Browser, migrate, ORIGIN, signIn } from "./harness";

beforeAll(migrate);
afterEach(() => vi.restoreAllMocks());

const withAnalytics = { environment: "posthog" } as const;

/** Stands in for PostHog's ingestion and asset hosts. */
function fakePostHog() {
  const calls: { url: string; method: string; headers: Headers; body: string }[] = [];
  const real = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input as RequestInfo, init);
    if (!new URL(request.url).hostname.endsWith(".posthog.com")) return real(input as RequestInfo, init);
    calls.push({
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.method === "POST" ? await request.text() : "",
    });
    return new Response('{"status":1}', {
      headers: {
        "content-type": "application/json",
        "set-cookie": "ph_tracking=1; Path=/",
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      },
    });
  });
  return calls;
}

describe("before analytics is set up", () => {
  it("reports the module off and passes nothing on", async () => {
    const calls = fakePostHog();
    const browser = new Browser();
    expect(await (await browser.fetch("/health")).json()).toMatchObject({ modules: { analytics: "off" } });
    await browser.fetch("/ingest/e/", { method: "POST", headers: { origin: ORIGIN }, body: "{}" });
    await browser.fetch("/ingest/static/array.js");
    expect(calls).toHaveLength(0);
  });
});

describe("with analytics on", () => {
  it("passes an event on to PostHog with only what PostHog needs", async () => {
    const calls = fakePostHog();
    const { browser } = await signIn("tracked@example.com", new Browser(withAnalytics));
    expect(await (await browser.fetch("/health")).json()).toMatchObject({ modules: { analytics: "on" } });

    const response = await browser.fetch("/ingest/e/?ip=1&ver=1.449.1", {
      method: "POST",
      headers: {
        origin: ORIGIN,
        "content-type": "text/plain",
        "user-agent": "TestBrowser/1.0",
        authorization: "Bearer should-not-leave",
        "x-app-identity": "access",
      },
      body: '{"event":"$pageview"}',
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"status":1}');
    // PostHog's cookie and CORS headers stop here; ours are added as on every response.
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("content-type")).toBe("application/json");

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe("https://us.i.posthog.com/e/?ip=1&ver=1.449.1");
    expect(call?.method).toBe("POST");
    expect(call?.body).toBe('{"event":"$pageview"}');
    expect(call?.headers.get("content-type")).toBe("text/plain");
    expect(call?.headers.get("user-agent")).toBe("TestBrowser/1.0");
    expect(call?.headers.get("x-forwarded-for")).toBe(browser.address);
    // The signed-in browser's session cookie, and everything else, stays behind.
    for (const name of [
      "cookie",
      "authorization",
      "cf-access-jwt-assertion",
      "x-app-identity",
      "x-app-origin",
      "origin",
    ]) {
      expect(call?.headers.get(name), name).toBeNull();
    }
  });

  it("fetches PostHog's scripts from its asset host", async () => {
    const calls = fakePostHog();
    const browser = new Browser(withAnalytics);
    expect((await browser.fetch("/ingest/static/array.js")).status).toBe(200);
    expect((await browser.fetch("/ingest/array/phc_test_runtime/config.js")).status).toBe(200);
    expect(calls.map((call) => call.url)).toEqual([
      "https://us-assets.i.posthog.com/static/array.js",
      "https://us-assets.i.posthog.com/array/phc_test_runtime/config.js",
    ]);
  });

  it("uses the EU hosts for an EU project", async () => {
    const calls = fakePostHog();
    const browser = new Browser({ environment: "posthog-eu" });
    await browser.fetch("/ingest/flags/?v=2", { method: "POST", headers: { origin: ORIGIN }, body: "{}" });
    await browser.fetch("/ingest/static/array.js");
    expect(calls.map((call) => call.url)).toEqual([
      "https://eu.i.posthog.com/flags/?v=2",
      "https://eu-assets.i.posthog.com/static/array.js",
    ]);
  });

  it("refuses other sites, other methods and other spellings of the path", async () => {
    const calls = fakePostHog();
    const browser = new Browser(withAnalytics);
    const crossSite = await browser.fetch("/ingest/e/", {
      method: "POST",
      headers: { origin: "https://elsewhere.example" },
      body: "{}",
    });
    expect(crossSite.status).toBe(403);
    expect((await browser.fetch("/ingest/e/", { method: "PUT", headers: { origin: ORIGIN }, body: "{}" })).status).toBe(
      405,
    );
    expect(
      (await browser.fetch("/INGEST/e/", { method: "POST", headers: { origin: ORIGIN }, body: "{}" })).status,
    ).toBe(404);
    expect(
      (await browser.fetch("/ingest%2Fe/", { method: "POST", headers: { origin: ORIGIN }, body: "{}" })).status,
    ).toBe(404);
    expect(calls).toHaveLength(0);
  });

  it("is not a way to reach anything but /ingest", async () => {
    const calls = fakePostHog();
    const browser = new Browser(withAnalytics);
    await browser.fetch("/ingestion", { method: "POST", headers: { origin: ORIGIN }, body: "{}" });
    await browser.fetch("/app/ingest/e/", { method: "POST", headers: { origin: ORIGIN }, body: "{}" });
    expect(calls).toHaveLength(0);
  });

  it("stays behind Cloudflare Access while the site is internal", async () => {
    const calls = fakePostHog();
    const outside = new Browser({ product: "private", ...withAnalytics });
    expect(
      (await outside.fetch("/ingest/e/", { method: "POST", headers: { origin: ORIGIN }, body: "{}" })).status,
    ).toBe(404);
    expect(calls).toHaveLength(0);
    const inside = new Browser({ product: "private", ...withAnalytics, accessEmail: "teammate@example.com" });
    expect((await inside.fetch("/ingest/e/", { method: "POST", headers: { origin: ORIGIN }, body: "{}" })).status).toBe(
      200,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.headers.get("cf-access-jwt-assertion")).toBeNull();
  });

  it("answers 502 when PostHog cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const response = await new Browser(withAnalytics).fetch("/ingest/e/", {
      method: "POST",
      headers: { origin: ORIGIN },
      body: "{}",
    });
    expect(response.status).toBe(502);
  });
});
