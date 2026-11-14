// What a model call costs. Prices are dollars per million tokens, which is the same number
// as millionths of a dollar ("micros") per token, so the ledger can stay in whole numbers.
//
// Check these against https://platform.claude.com/docs/en/about-claude/pricing when you
// change AI_MODEL. A model missing from the table is charged as the dearest one here, so a
// new model can only ever be over-counted.

export interface Price {
  input: number;
  output: number;
  cacheRead: number;
}

const price = (input: number, output: number, cacheRead: number): Price => ({ input, output, cacheRead });

const PRICES: Record<string, Price> = {
  "claude-fable-5-2": price(8, 40, 0.2),
  "claude-fable-5-1": price(10, 50, 0.25),
  "claude-opus-5-5": price(4, 20, 0.2),
  "claude-opus-5": price(5, 25, 0.5),
  "claude-opus-4-8": price(5, 25, 0.5),
  "claude-sonnet-5-5": price(2, 10, 0.1),
  "claude-sonnet-5": price(2, 10, 0.2),
  "claude-haiku-5-5": price(0.1, 0.5, 0.01),
};
/** Claude Haiku 5.5 costs more once a prompt passes this many tokens. */
const HAIKU_LONG_PROMPT_TOKENS = 100_000;
const HAIKU_LONG_PROMPT = price(0.5, 2.5, 0.05);

const DEAREST = Object.values(PRICES).reduce((top, next) => (next.output > top.output ? next : top));

/** Writing to the prompt cache costs more than plain input: 1.25x for five minutes, 2x for an hour. */
const CACHE_WRITE_5M = 1.25;
const CACHE_WRITE_1H = 2;

export function priceOf(model: string, promptTokens = 0): Price {
  if (model === "claude-haiku-5-5" && promptTokens > HAIKU_LONG_PROMPT_TOKENS) return HAIKU_LONG_PROMPT;
  return PRICES[model] ?? DEAREST;
}

/** Token counts for one attempt at a call, as the API reports them. */
export interface AttemptUsage {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_creation?: { ephemeral_5m_input_tokens: number; ephemeral_1h_input_tokens: number } | null;
}

/** What one attempt cost, in micros, rounded up. */
export function costMicros(usage: AttemptUsage): number {
  const read = usage.cache_read_input_tokens ?? 0;
  const written = usage.cache_creation_input_tokens ?? 0;
  const rate = priceOf(usage.model, usage.input_tokens + read + written);
  const hour = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const fiveMinutes = usage.cache_creation ? usage.cache_creation.ephemeral_5m_input_tokens : written;
  return Math.ceil(
    usage.input_tokens * rate.input +
      usage.output_tokens * rate.output +
      read * rate.cacheRead +
      fiveMinutes * rate.input * CACHE_WRITE_5M +
      hour * rate.input * CACHE_WRITE_1H,
  );
}

/**
 * The most a call could cost, to hold against the budget before it is made. `inputBytes`
 * bounds the prompt (a token is at least one byte). `models` are the model asked for and
 * any it may fall back to: the dearest of them sets the price, and each may run once.
 */
export function worstCaseMicros(models: readonly string[], inputBytes: number, maxOutputTokens: number): number {
  const rates = models.map((model) => priceOf(model, inputBytes));
  const input = Math.max(...rates.map((rate) => rate.input));
  const output = Math.max(...rates.map((rate) => rate.output));
  return Math.ceil((inputBytes * input + maxOutputTokens * output) * models.length);
}

export const usd = (micros: number) => Math.round(micros / 10_000) / 100;
