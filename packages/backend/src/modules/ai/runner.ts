// Asks the model one question and streams the answer back.
//
// The call is made with Anthropic's SDK, through Cloudflare AI Gateway when AI_GATEWAY_URL
// is set (logs, caching and rate limits in the Cloudflare dashboard), otherwise directly.
// Before it starts, the most it could cost is held against the month's budget (ledger.ts);
// when it ends, that is corrected to what the API says it used.
//
// The call runs to its end even if the person stops reading, so the ledger gets the real
// cost. Cloudflare allows about 30 seconds for that after a client leaves; past it, the
// held amount stays as the charge.
import { waitUntil } from "cloudflare:workers";
import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { UserError } from "../../core/errors";
import { productOf } from "../../core/product";
import type { Env } from "../../env";
import { budgetFor, type Reservation, release, reserve, settle } from "./ledger";
import { type AttemptUsage, costMicros, usd, worstCaseMicros } from "./prices";
import { type AiSettings, aiOn, aiSettings } from "./settings";

/** Thinking and the answer together. A lower cap cuts long answers short. */
const MAX_OUTPUT_TOKENS = 16_000;
/** Tokens the API adds around a prompt (roles, formatting), with room to spare. */
const PROMPT_OVERHEAD_TOKENS = 200;
/** The dearest model a declined request may be retried on. */
const DEAREST_FALLBACK = "claude-opus-5";

export type AskEvent =
  | { type: "text"; text: string }
  /** Always last. "refused": the model declined, so discard any text already shown. */
  | { type: "done"; outcome: "complete" | "cut_short" | "refused" | "failed" };

/** Claude Haiku has no server-side fallback; every other current model does. */
const canFallBack = (model: string) => !model.startsWith("claude-haiku");

function client(settings: AiSettings): Anthropic {
  return new Anthropic({
    apiKey: settings.apiKey,
    baseURL: settings.baseURL,
    defaultHeaders: settings.gatewayToken ? { "cf-aig-authorization": `Bearer ${settings.gatewayToken}` } : undefined,
  });
}

/** A queue between the model call, which runs on its own, and whoever reads the answer. */
function channel<T>() {
  const items: T[] = [];
  let closed = false;
  let wake: (() => void) | undefined;
  return {
    push(item: T) {
      items.push(item);
      wake?.();
    },
    close() {
      closed = true;
      wake?.();
    },
    async *read(): AsyncGenerator<T, void, void> {
      for (;;) {
        while (items.length > 0) yield items.shift() as T;
        if (closed) return;
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
      }
    },
  };
}

async function run(
  env: Env,
  settings: AiSettings,
  reservation: Reservation,
  request: { system: string; prompt: string },
  out: ReturnType<typeof channel<AskEvent>>,
): Promise<void> {
  // True once the API has accepted the request: from then on it is billed.
  let accepted = false;
  try {
    const stream = client(settings).beta.messages.stream({
      model: settings.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: request.system,
      messages: [{ role: "user", content: request.prompt }],
      // When the model declines a request on policy grounds, the API retries it once on the
      // model Anthropic recommends for that kind of refusal, inside this same call.
      ...(canFallBack(settings.model)
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
    });
    for await (const event of stream) {
      accepted = true;
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        out.push({ type: "text", text: event.delta.text });
      }
    }
    const message = await stream.finalMessage();
    // With a fallback, each attempt is listed and billed at its own model's price.
    const attempts: AttemptUsage[] = message.usage.iterations?.length
      ? message.usage.iterations.flatMap((attempt) =>
          attempt.type === "message" || attempt.type === "fallback_message"
            ? [{ ...attempt, model: attempt.model ?? message.model }]
            : [],
        )
      : [{ ...message.usage, model: message.model }];
    await settle(env, reservation, {
      micros: attempts.reduce((sum, attempt) => sum + costMicros(attempt), 0),
      inputTokens: attempts.reduce((sum, attempt) => sum + attempt.input_tokens, 0),
      outputTokens: attempts.reduce((sum, attempt) => sum + attempt.output_tokens, 0),
    });
    // Check for a refusal before trusting the text: a refusal can arrive after some of it.
    const outcome =
      message.stop_reason === "refusal" ? "refused" : message.stop_reason === "max_tokens" ? "cut_short" : "complete";
    out.push({ type: "done", outcome });
  } catch (error) {
    if (!accepted) await release(env, reservation).catch(() => undefined);
    console.error(
      JSON.stringify({
        event: "ai_call_failed",
        status: error instanceof APIError ? (error.status ?? null) : null,
        message: error instanceof Error ? error.message : "unknown",
      }),
    );
    out.push({ type: "done", outcome: "failed" });
  } finally {
    out.close();
  }
}

const systemFor = (env: Env) => `You are the assistant inside ${productOf(env).name}. Answer plainly and briefly.`;

/** The most one question could cost: what is held against the budget while it is answered. */
function holdFor(settings: AiSettings, system: string, prompt: string): number {
  const inputBytes = new TextEncoder().encode(system + prompt).length + PROMPT_OVERHEAD_TOKENS;
  const models = canFallBack(settings.model) ? [settings.model, DEAREST_FALLBACK] : [settings.model];
  return worstCaseMicros(models, inputBytes, MAX_OUTPUT_TOKENS);
}

/**
 * Starts an answer to `prompt` for this person. Refuses up front when the module is off or
 * the budget has no room; after that, the returned events always end with a "done".
 */
export async function ask(env: Env, userId: string, prompt: string): Promise<AsyncGenerator<AskEvent, void, void>> {
  if (!aiOn(env)) throw new UserError(503, "ai_off", "AI is not set up for this product yet.");
  const settings = aiSettings(env);
  const system = systemFor(env);
  const reservation = await reserve(env, {
    userId,
    model: settings.model,
    micros: holdFor(settings, system, prompt),
    budgetMicros: settings.budgetMicros,
    personMicros: settings.personMicros,
  });
  const out = channel<AskEvent>();
  waitUntil(run(env, settings, reservation, { system, prompt }, out));
  return out.read();
}

/** Where a person stands this month: what they have used, their limit, and whether a short question would be accepted. */
export async function budget(
  env: Env,
  userId: string,
): Promise<{ on: boolean; month: string; usedUsd: number; limitUsd: number; open: boolean }> {
  const on = aiOn(env);
  const settings = aiSettings(env);
  const state = await budgetFor(env, userId, { ...settings, needMicros: holdFor(settings, systemFor(env), "") });
  return {
    on,
    month: state.month,
    usedUsd: usd(state.usedMicros),
    limitUsd: usd(state.limitMicros),
    open: on && state.open,
  };
}
