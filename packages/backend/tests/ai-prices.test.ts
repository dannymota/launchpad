// What the AI ledger charges for a call. Prices are per million tokens; costs are in
// millionths of a dollar.
import { describe, expect, it } from "vitest";
import { costMicros, priceOf, usd, worstCaseMicros } from "../src/modules/ai/prices";

describe("the cost of a model call", () => {
  it("charges input and output at the model's price", () => {
    expect(costMicros({ model: "claude-opus-5-5", input_tokens: 1000, output_tokens: 500 })).toBe(4000 + 10_000);
    expect(costMicros({ model: "claude-sonnet-5-5", input_tokens: 1000, output_tokens: 500 })).toBe(2000 + 5000);
  });

  it("rounds a fraction of a millionth up, never down", () => {
    expect(costMicros({ model: "claude-haiku-5-5", input_tokens: 1, output_tokens: 1 })).toBe(1);
  });

  it("charges cache reads at the reduced price and cache writes at the raised one", () => {
    const cached = { model: "claude-opus-5-5", input_tokens: 0, output_tokens: 0 };
    expect(costMicros({ ...cached, cache_read_input_tokens: 10_000 })).toBe(2000);
    expect(costMicros({ ...cached, cache_creation_input_tokens: 1000 })).toBe(5000);
    expect(
      costMicros({
        ...cached,
        cache_creation_input_tokens: 2000,
        cache_creation: { ephemeral_5m_input_tokens: 1000, ephemeral_1h_input_tokens: 1000 },
      }),
    ).toBe(5000 + 8000);
  });

  it("moves Claude Haiku 5.5 to its higher price for a long prompt", () => {
    expect(costMicros({ model: "claude-haiku-5-5", input_tokens: 100_000, output_tokens: 0 })).toBe(10_000);
    expect(costMicros({ model: "claude-haiku-5-5", input_tokens: 100_001, output_tokens: 0 })).toBe(50_001);
  });

  it("charges a model it does not know as the dearest one it does", () => {
    expect(priceOf("claude-some-future-model")).toEqual(priceOf("claude-fable-5-1"));
    for (const model of ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-2"]) {
      expect(priceOf("claude-some-future-model").output).toBeGreaterThanOrEqual(priceOf(model).output);
      expect(priceOf("claude-some-future-model").input).toBeGreaterThanOrEqual(priceOf(model).input);
    }
  });
});

describe("the amount held before a call", () => {
  it("covers the dearest model at full length, once for each model that may run", () => {
    // Asked of Opus 5.5 ($4/$20), with a fallback to Opus 5 ($5/$25): both priced as Opus 5.
    expect(worstCaseMicros(["claude-opus-5-5", "claude-opus-5"], 1000, 16_000)).toBe((1000 * 5 + 16_000 * 25) * 2);
    expect(worstCaseMicros(["claude-haiku-5-5"], 1000, 16_000)).toBe(Math.ceil(1000 * 0.1 + 16_000 * 0.5));
  });

  it("is never less than what the call can cost", () => {
    const held = worstCaseMicros(["claude-opus-5-5", "claude-opus-5"], 1000, 16_000);
    const declined = costMicros({ model: "claude-opus-5-5", input_tokens: 1000, output_tokens: 16_000 });
    const answered = costMicros({ model: "claude-opus-5", input_tokens: 1000, output_tokens: 16_000 });
    expect(held).toBeGreaterThanOrEqual(declined + answered);
  });
});

describe("dollars for display", () => {
  it("rounds to cents", () => {
    expect(usd(2_004_999)).toBe(2);
    expect(usd(2_005_000)).toBe(2.01);
    expect(usd(0)).toBe(0);
  });
});
