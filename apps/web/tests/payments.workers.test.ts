// The payments module, proven on the Workers runtime with Stripe's API stood in for: it is
// off until its keys are set, checkout starts for a paid plan, and a signed webhook from
// Stripe is what moves an account onto the plan.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Browser, migrate, signIn } from "./harness";
import { ENVIRONMENTS } from "./products";

beforeAll(migrate);
afterEach(() => vi.restoreAllMocks());

const selling = { product: "with-plans", environment: "stripe" } as const;
const plan = async (browser: Browser) => (await browser.fetch("/api/billing/current")).json();

/** Stands in for api.stripe.com. Records what was asked, and answers the calls checkout makes. */
function fakeStripe() {
  const calls: { method: string; path: string; body: URLSearchParams }[] = [];
  const real = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input as RequestInfo, init);
    const url = new URL(request.url);
    if (url.hostname !== "api.stripe.com") return real(input as RequestInfo, init);
    const body = new URLSearchParams(request.method === "GET" ? "" : await request.text());
    calls.push({ method: request.method, path: url.pathname, body });
    const answer = (value: unknown) => Response.json(value, { headers: { "request-id": "req_test" } });
    if (request.method === "POST" && url.pathname === "/v1/customers")
      return answer({ id: "cus_test", object: "customer" });
    if (request.method === "POST" && url.pathname === "/v1/checkout/sessions") {
      return answer({ id: "cs_test", object: "checkout.session", url: "https://checkout.stripe.com/c/pay/cs_test" });
    }
    if (url.pathname === "/v1/subscriptions/sub_test") {
      const now = Math.floor(Date.now() / 1000);
      return answer({
        id: "sub_test",
        object: "subscription",
        status: "active",
        customer: "cus_test",
        cancel_at_period_end: false,
        items: {
          data: [
            {
              id: "si_test",
              quantity: 1,
              price: { id: "price_pro_test" },
              current_period_start: now,
              current_period_end: now + 2_592_000,
            },
          ],
        },
      });
    }
    if (url.pathname.endsWith("/search")) return answer({ object: "search_result", data: [], has_more: false });
    return answer({ object: "list", data: [], has_more: false });
  });
  return calls;
}

/** A webhook request signed the way Stripe signs them. */
async function signedWebhook(event: unknown, secret: string): Promise<RequestInit> {
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const hex = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": `t=${timestamp},v1=${hex}` },
    body: payload,
  };
}

describe("before payments are set up", () => {
  it("has no payment routes, and everyone is on the free plan", async () => {
    const { browser } = await signIn("unpaid@example.com", new Browser({ product: "with-plans" }));
    expect(await (await browser.fetch("/health")).json()).toMatchObject({ modules: { payments: "off" } });
    expect((await browser.fetch("/api/auth/subscription/list")).status).toBe(404);
    expect((await browser.post("/api/auth/subscription/upgrade", { plan: "pro" })).status).toBe(404);
    expect((await browser.post("/api/auth/stripe/webhook", {})).status).toBe(404);
    expect(await plan(browser)).toEqual({ plan: "free", status: "none", endsAtPeriodEnd: false });
  });
});

describe("with payments on", () => {
  it("reports the module on and lists no subscriptions for a new account", async () => {
    const { browser } = await signIn("new-customer@example.com", new Browser(selling));
    expect(await (await browser.fetch("/health")).json()).toMatchObject({ modules: { payments: "on" } });
    const list = await browser.fetch("/api/auth/subscription/list");
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual([]);
  });

  it("needs a signed-in person to start checkout", async () => {
    fakeStripe();
    const response = await new Browser(selling).post("/api/auth/subscription/upgrade", {
      plan: "pro",
      successUrl: "/",
      cancelUrl: "/",
    });
    expect(response.status).toBe(401);
  });

  it("starts checkout for a paid plan at that plan's price, and stays on free until Stripe confirms", async () => {
    const calls = fakeStripe();
    const { browser } = await signIn("buyer@example.com", new Browser(selling));
    const response = await browser.post("/api/auth/subscription/upgrade", {
      plan: "pro",
      successUrl: "/settings/billing",
      cancelUrl: "/settings/billing",
      disableRedirect: true,
    });
    expect(response.status, await response.clone().text()).toBe(200);
    expect(await response.json()).toMatchObject({ url: "https://checkout.stripe.com/c/pay/cs_test" });
    const checkout = calls.find((call) => call.path === "/v1/checkout/sessions");
    expect(checkout?.body.get("line_items[0][price]")).toBe("price_pro_test");
    expect(checkout?.body.get("mode")).toBe("subscription");
    expect(await plan(browser)).toMatchObject({ plan: "free" });
  });

  it("refuses a plan that is not for sale", async () => {
    fakeStripe();
    const { browser } = await signIn("chancer@example.com", new Browser(selling));
    const response = await browser.post("/api/auth/subscription/upgrade", {
      plan: "enterprise",
      successUrl: "/",
      cancelUrl: "/",
    });
    expect(response.status).toBe(400);
  });

  it("moves the account onto the plan when Stripe's signed webhook says checkout completed", async () => {
    const calls = fakeStripe();
    const { browser, userId } = await signIn("paid@example.com", new Browser(selling));
    await browser.post("/api/auth/subscription/upgrade", {
      plan: "pro",
      successUrl: "/",
      cancelUrl: "/",
      disableRedirect: true,
    });
    const checkout = calls.find((call) => call.path === "/v1/checkout/sessions");
    const metadata = Object.fromEntries(
      [...(checkout?.body ?? [])]
        .filter(([key]) => key.startsWith("metadata["))
        .map(([key, value]) => [key.slice(9, -1), value]),
    );
    expect(metadata.referenceId).toBe(userId);

    const event = {
      id: "evt_test",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          object: "checkout.session",
          mode: "subscription",
          subscription: "sub_test",
          customer: "cus_test",
          client_reference_id: userId,
          metadata,
        },
      },
    };
    const stripeCalls = new Browser(selling);
    const accepted = await stripeCalls.fetch(
      "/api/auth/stripe/webhook",
      await signedWebhook(event, ENVIRONMENTS.stripe.STRIPE_WEBHOOK_SECRET),
    );
    expect(accepted.status, await accepted.clone().text()).toBe(200);
    expect(await plan(browser)).toEqual({ plan: "pro", status: "active", endsAtPeriodEnd: false });
  });

  it("ignores a webhook that Stripe did not sign", async () => {
    fakeStripe();
    const { browser, userId } = await signIn("forged-webhook@example.com", new Browser(selling));
    const event = {
      id: "evt_forged",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_x",
          mode: "subscription",
          subscription: "sub_test",
          client_reference_id: userId,
          metadata: { referenceId: userId },
        },
      },
    };
    const outsider = new Browser(selling);
    const unsigned = await outsider.fetch("/api/auth/stripe/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });
    expect(unsigned.status).toBe(400);
    const wrongKey = await outsider.fetch(
      "/api/auth/stripe/webhook",
      await signedWebhook(event, "whsec_not_the_secret"),
    );
    expect(wrongKey.status).toBe(400);
    expect(await plan(browser)).toMatchObject({ plan: "free" });
  });
});
