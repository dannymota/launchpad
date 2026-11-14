// The AI module, proven on the Workers runtime with Anthropic's API stood in for: it is off
// until its key is set, an answer streams to the caller, the ledger ends up holding what the
// call really cost, and the budget refuses calls it has no room for, even two at once.
import { createApiClient } from "@app/shared/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Browser, env, migrate, ORIGIN, signIn } from "./harness";

beforeAll(migrate);
beforeEach(async () => {
  await env.DB.prepare("delete from ai_usage").run();
});
afterEach(() => vi.restoreAllMocks());

const withAi = { environment: "ai" } as const;

/** The typed client the web and mobile apps use, sending through a test browser. */
function apiFor(browser: Browser) {
  return createApiClient({
    origin: ORIGIN,
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const headers = new Headers(request.headers);
      headers.set("origin", ORIGIN);
      const body = request.method === "GET" ? undefined : await request.text();
      return browser.fetch(request.url, { method: request.method, headers, body });
    }) as typeof fetch,
  });
}

interface Reply {
  status?: number;
  text?: string[];
  model?: string;
  stop?: string;
  usage?: { input_tokens: number; output_tokens: number };
  /** Per-attempt usage, as the API reports it when a fallback ran. */
  iterations?: unknown[];
  /** Hold the answer until this settles, to line up two calls at once. */
  until?: Promise<void>;
}

/** Stands in for Anthropic's API (or an AI Gateway in front of it), answering as a stream. */
function fakeAnthropic(reply: Reply = {}) {
  const calls: { url: URL; headers: Headers; body: Record<string, unknown> }[] = [];
  const real = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input as RequestInfo, init);
    const url = new URL(request.url);
    if (url.hostname !== "api.anthropic.com" && url.hostname !== "gateway.ai.cloudflare.com") {
      return real(input as RequestInfo, init);
    }
    calls.push({ url, headers: request.headers, body: JSON.parse(await request.text()) });
    await reply.until;
    if (reply.status && reply.status !== 200) {
      return Response.json(
        { type: "error", error: { type: "invalid_request_error", message: "Refused by the test." } },
        { status: reply.status },
      );
    }
    const model = reply.model ?? "claude-opus-5-5";
    const usage = reply.usage ?? { input_tokens: 20, output_tokens: 100 };
    const events: Record<string, unknown>[] = [
      {
        type: "message_start",
        message: {
          id: "msg_test",
          type: "message",
          role: "assistant",
          model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: usage.input_tokens, output_tokens: 1 },
        },
      },
      { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
      ...(reply.text ?? ["Hello", ", world."]).map((text) => ({
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text },
      })),
      { type: "content_block_stop", index: 0 },
      {
        type: "message_delta",
        delta: { stop_reason: reply.stop ?? "end_turn", stop_sequence: null },
        usage: { output_tokens: usage.output_tokens, ...(reply.iterations ? { iterations: reply.iterations } : {}) },
      },
      { type: "message_stop" },
    ];
    const stream = events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join("");
    return new Response(stream, { headers: { "content-type": "text/event-stream", "request-id": "req_test" } });
  });
  return calls;
}

async function answer(browser: Browser, prompt = "What is this product?") {
  const events = [];
  for await (const event of await apiFor(browser).ai.ask({ prompt })) events.push(event);
  const text = events.flatMap((event) => (event.type === "text" ? [event.text] : [])).join("");
  const last = events.at(-1);
  return { events, text, outcome: last?.type === "done" ? last.outcome : null };
}

const ledger = async () =>
  (await env.DB.prepare("select user_id, model, micros, state, input_tokens, output_tokens from ai_usage").all())
    .results;

describe("before AI is set up", () => {
  it("reports the module off, refuses questions, and spends nothing", async () => {
    const calls = fakeAnthropic();
    const { browser } = await signIn("no-ai@example.com");
    expect(await (await browser.fetch("/health")).json()).toMatchObject({ modules: { ai: "off" } });
    const response = await browser.post("/api/ai/ask", { prompt: "Hello?" });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ data: { reason: "ai_off" } });
    expect(await (await browser.fetch("/api/ai/budget")).json()).toMatchObject({ on: false, open: false });
    expect(calls).toHaveLength(0);
    expect(await ledger()).toEqual([]);
  });
});

describe("with AI on", () => {
  it("needs a signed-in person", async () => {
    const calls = fakeAnthropic();
    expect((await new Browser(withAi).post("/api/ai/ask", { prompt: "Hello?" })).status).toBe(401);
    expect((await new Browser(withAi).fetch("/api/ai/budget")).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("streams the answer and records what the call really cost", async () => {
    const calls = fakeAnthropic({
      text: ["It is ", "a test ", "product."],
      usage: { input_tokens: 20, output_tokens: 100 },
    });
    const { browser, userId } = await signIn("asker@example.com", new Browser(withAi));
    expect(await (await browser.fetch("/health")).json()).toMatchObject({ modules: { ai: "on" } });

    const result = await answer(browser);
    expect(result.text).toBe("It is a test product.");
    expect(result.outcome).toBe("complete");
    expect(result.events.filter((event) => event.type === "text")).toHaveLength(3);

    // 20 input tokens at $4 and 100 output tokens at $20 per million: 2,080 millionths of a dollar.
    expect(await ledger()).toEqual([
      {
        user_id: userId,
        model: "claude-opus-5-5",
        micros: 2080,
        state: "settled",
        input_tokens: 20,
        output_tokens: 100,
      },
    ]);
    expect(await (await browser.fetch("/api/ai/budget")).json()).toMatchObject({
      on: true,
      usedUsd: 0,
      limitUsd: 2,
      open: true,
    });

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url.href).toBe("https://api.anthropic.com/v1/messages");
    expect(call?.headers.get("authorization")).toBe("Bearer sk-ant-test-runtime");
    expect(call?.headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    expect(call?.body).toMatchObject({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      stream: true,
      fallbacks: "default",
      messages: [{ role: "user", content: "What is this product?" }],
    });
    expect(call?.body.system).toContain("Test Product");
  });

  it("goes through AI Gateway when one is set, and asks for no fallback on a model that has none", async () => {
    const calls = fakeAnthropic({ model: "claude-haiku-5-5", usage: { input_tokens: 1000, output_tokens: 1000 } });
    const { browser } = await signIn("gateway@example.com", new Browser({ environment: "ai-gateway" }));
    expect((await answer(browser)).outcome).toBe("complete");
    const [call] = calls;
    expect(call?.url.href).toBe("https://gateway.ai.cloudflare.com/v1/test-account/test-gateway/anthropic/v1/messages");
    expect(call?.headers.get("cf-aig-authorization")).toBe("Bearer gateway-token-test");
    expect(call?.body).toMatchObject({ model: "claude-haiku-5-5" });
    expect(call?.body).not.toHaveProperty("fallbacks");
    // 1,000 tokens in at $0.10 and 1,000 out at $0.50 per million.
    expect(await ledger()).toMatchObject([{ model: "claude-haiku-5-5", micros: 600, state: "settled" }]);
  });

  it("charges each attempt at its own model's price when a fallback model answered", async () => {
    fakeAnthropic({
      model: "claude-opus-5",
      usage: { input_tokens: 50, output_tokens: 200 },
      iterations: [
        {
          type: "message",
          model: "claude-opus-5-5",
          input_tokens: 50,
          output_tokens: 10,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
          cache_creation: null,
        },
        {
          type: "fallback_message",
          model: "claude-opus-5",
          input_tokens: 50,
          output_tokens: 200,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
          cache_creation: null,
        },
      ],
    });
    const { browser } = await signIn("fallback@example.com", new Browser(withAi));
    expect((await answer(browser)).outcome).toBe("complete");
    // (50 x $4 + 10 x $20) for the attempt that declined, (50 x $5 + 200 x $25) for the one that answered.
    expect(await ledger()).toMatchObject([
      { micros: 400 + 5250, state: "settled", input_tokens: 100, output_tokens: 210 },
    ]);
  });

  it("says so when the model declines, and still records the cost", async () => {
    fakeAnthropic({ text: ["I can"], stop: "refusal", usage: { input_tokens: 30, output_tokens: 5 } });
    const { browser } = await signIn("declined@example.com", new Browser(withAi));
    expect((await answer(browser)).outcome).toBe("refused");
    expect(await ledger()).toMatchObject([{ micros: 30 * 4 + 5 * 20, state: "settled" }]);
  });

  it("says so when an answer hits the length limit", async () => {
    fakeAnthropic({ stop: "max_tokens" });
    const { browser } = await signIn("long@example.com", new Browser(withAi));
    expect((await answer(browser)).outcome).toBe("cut_short");
  });

  it("gives back what it held when the API refuses the call", async () => {
    const calls = fakeAnthropic({ status: 400 });
    const { browser } = await signIn("broken@example.com", new Browser(withAi));
    const result = await answer(browser);
    expect(result.outcome).toBe("failed");
    expect(result.text).toBe("");
    expect(calls).toHaveLength(1);
    expect(await ledger()).toEqual([]);
  });

  it("refuses overlong and empty questions before any call", async () => {
    const calls = fakeAnthropic();
    const { browser } = await signIn("wordy@example.com", new Browser(withAi));
    expect((await browser.post("/api/ai/ask", { prompt: "x".repeat(4001) })).status).toBe(400);
    expect((await browser.post("/api/ai/ask", { prompt: "   " })).status).toBe(400);
    expect(calls).toHaveLength(0);
    expect(await ledger()).toEqual([]);
  });
});

describe("the budget", () => {
  it("refuses a call once the product's month is spent, without calling the API", async () => {
    const calls = fakeAnthropic();
    const { browser } = await signIn("late@example.com", new Browser({ environment: "ai-spent" }));
    const response = await browser.post("/api/ai/ask", { prompt: "Hello?" });
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ data: { reason: "ai_budget" } });
    expect(await (await browser.fetch("/api/ai/budget")).json()).toMatchObject({ on: true, open: false });
    expect(calls).toHaveLength(0);
    expect(await ledger()).toEqual([]);
  });

  it("counts what other people spent toward the product's budget", async () => {
    const calls = fakeAnthropic();
    const month = new Date().toISOString().slice(0, 7);
    await env.DB.prepare(
      "insert into ai_usage (id, user_id, month, model, micros, state) values ('other', null, ?, 'claude-opus-5-5', 9900000, 'settled')",
    )
      .bind(month)
      .run();
    const { browser } = await signIn("crowded@example.com", new Browser(withAi));
    const response = await browser.post("/api/ai/ask", { prompt: "Hello?" });
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ data: { reason: "ai_budget" } });
    expect(calls).toHaveLength(0);
  });

  it("says a question would be refused when a person's share has less room than a call holds", async () => {
    const calls = fakeAnthropic();
    const { browser, userId } = await signIn("nearly-out@example.com", new Browser({ environment: "ai-tight" }));
    expect(await (await browser.fetch("/api/ai/budget")).json()).toMatchObject({ usedUsd: 0, limitUsd: 1, open: true });
    // Half the $1 share is spent. A call holds about 80 cents, so it no longer fits.
    await env.DB.prepare(
      "insert into ai_usage (id, user_id, month, model, micros, state) values ('half', ?, ?, 'claude-opus-5-5', 500000, 'settled')",
    )
      .bind(userId, new Date().toISOString().slice(0, 7))
      .run();
    expect(await (await browser.fetch("/api/ai/budget")).json()).toMatchObject({ usedUsd: 0.5, open: false });
    const response = await browser.post("/api/ai/ask", { prompt: "Hello?" });
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ data: { reason: "ai_person_budget" } });
    expect(calls).toHaveLength(0);
  });

  it("ignores last month", async () => {
    fakeAnthropic();
    await env.DB.prepare(
      "insert into ai_usage (id, user_id, month, model, micros, state) values ('old', null, '2020-01', 'claude-opus-5-5', 999000000, 'settled')",
    ).run();
    const { browser } = await signIn("new-month@example.com", new Browser(withAi));
    expect((await answer(browser)).outcome).toBe("complete");
  });

  it("holds the worst case while a call runs, so two at once cannot overshoot a person's share", async () => {
    let finish: () => void = () => undefined;
    const calls = fakeAnthropic({ until: new Promise<void>((resolve) => (finish = resolve)) });
    const { browser, userId } = await signIn("double@example.com", new Browser({ environment: "ai-tight" }));

    // Both start before the stand-in answers. One is accepted and waits; the other is refused at once.
    const outcomes = await Promise.allSettled([
      apiFor(browser).ai.ask({ prompt: "One" }),
      apiFor(browser).ai.ask({ prompt: "Two" }),
    ]);
    const accepted = outcomes.flatMap((outcome) => (outcome.status === "fulfilled" ? [outcome.value] : []));
    const refused = outcomes.flatMap((outcome) => (outcome.status === "rejected" ? [outcome.reason] : []));
    expect(accepted).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatchObject({ data: { reason: "ai_person_budget" } });
    expect(calls).toHaveLength(1);
    // While it runs, the ledger holds the most the call could cost: about 80 cents.
    const held = await ledger();
    expect(held).toMatchObject([{ user_id: userId, state: "reserved" }]);
    expect((held[0] as { micros: number }).micros).toBeGreaterThan(800_000);
    expect((held[0] as { micros: number }).micros).toBeLessThan(1_000_000);

    finish();
    for await (const _ of accepted[0] ?? []) void _;
    expect(await ledger()).toMatchObject([{ state: "settled", micros: 2080 }]);
    // With the real cost recorded, there is room again.
    expect((await answer(browser)).outcome).toBe("complete");
  });

  it("keeps the spending on record when the account is deleted", async () => {
    fakeAnthropic();
    const { browser } = await signIn("leaving@example.com", new Browser(withAi));
    expect((await answer(browser)).outcome).toBe("complete");
    expect((await browser.post("/api/account/delete", { confirm: "delete my account" })).status).toBe(200);
    expect(await ledger()).toMatchObject([{ user_id: null, micros: 2080, state: "settled" }]);
  });
});
