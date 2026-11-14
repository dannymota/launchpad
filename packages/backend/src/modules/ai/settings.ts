// The AI module's settings, read from the Worker's variables and secrets.
import { ConfigError } from "../../core/errors";
import type { Env } from "../../env";

export const DEFAULT_MODEL = "claude-opus-5-5";
const DEFAULT_BUDGET_USD = 10;
const DEFAULT_PERSON_BUDGET_USD = 2;

export const aiOn = (env: Env) => Boolean(env.ANTHROPIC_API_KEY);

function dollars(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback * 1_000_000;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new ConfigError(`${name} must be a number of dollars, 0 or more.`);
  return Math.round(amount * 1_000_000);
}

export interface AiSettings {
  apiKey: string;
  /** Cloudflare AI Gateway's Anthropic endpoint. Undefined = call Anthropic directly. */
  baseURL: string | undefined;
  gatewayToken: string | undefined;
  model: string;
  /** The whole product's budget for a month, and one person's share of it, in micros. */
  budgetMicros: number;
  personMicros: number;
}

export function aiSettings(env: Env): AiSettings {
  return {
    apiKey: env.ANTHROPIC_API_KEY ?? "",
    baseURL: env.AI_GATEWAY_URL?.trim() || undefined,
    gatewayToken: env.AI_GATEWAY_TOKEN?.trim() || undefined,
    model: env.AI_MODEL?.trim() || DEFAULT_MODEL,
    budgetMicros: dollars("AI_MONTHLY_BUDGET_USD", env.AI_MONTHLY_BUDGET_USD, DEFAULT_BUDGET_USD),
    personMicros: dollars("AI_PERSON_MONTHLY_BUDGET_USD", env.AI_PERSON_MONTHLY_BUDGET_USD, DEFAULT_PERSON_BUDGET_USD),
  };
}
