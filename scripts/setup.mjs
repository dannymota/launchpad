#!/usr/bin/env node
// Sets a deployed Worker's secrets. A secret's value comes from this shell's environment
// and goes to Cloudflare through wrangler's standard input: it is never printed, written to
// a file or put on a command line.
//
//   npm run setup -- <staging|production>
//
// Every name below that is set in the environment is stored; the rest are left as they are.
// The signing secret is generated the first time. Run it again whenever you have a new key.
// The Worker must exist first: `npm run deploy` creates it, and runs this for you.
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { accountOf, cloudflareApi, tokenFrom, wrangler } from "./lib/cloudflare.mjs";
import { loadProduct, targetOf } from "./lib/product.mjs";

/** Each setting a deployed Worker can be given, and what it turns on. */
export const SETTINGS = [
  ["ADMIN_EMAILS", "who is an admin when verified by Cloudflare Access (comma-separated)"],
  ["SIGNUP_ALLOWLIST", "who may create an account while signup is by allowlist (comma-separated)"],
  ["GOOGLE_CLIENT_ID", "Sign in with Google"],
  ["GOOGLE_CLIENT_SECRET", "Sign in with Google"],
  ["APPLE_CLIENT_ID", "Sign in with Apple"],
  ["APPLE_TEAM_ID", "Sign in with Apple"],
  ["APPLE_KEY_ID", "Sign in with Apple"],
  ["APPLE_PRIVATE_KEY", "Sign in with Apple"],
  // >>> mobile
  ["APPLE_APP_BUNDLE_ID", "Sign in with Apple from the iOS app"],
  ["ANDROID_CERT_SHA256", "links that open the Android app"],
  // <<< mobile
  ["TURNSTILE_SECRET_KEY", "Cloudflare Turnstile on the sign-in form (with TURNSTILE_SITE_KEY in wrangler.jsonc)"],
  // >>> payments
  ["STRIPE_SECRET_KEY", "payments"],
  ["STRIPE_WEBHOOK_SECRET", "payments"],
  // <<< payments
  // >>> ai
  ["ANTHROPIC_API_KEY", "AI"],
  ["AI_GATEWAY_URL", "AI through Cloudflare AI Gateway"],
  ["AI_GATEWAY_TOKEN", "AI through a gateway that asks for a token"],
  ["AI_MONTHLY_BUDGET_USD", "the AI budget for a month (default 10)"],
  ["AI_PERSON_MONTHLY_BUDGET_USD", "one person's share of the AI budget (default 2)"],
  // <<< ai
  // >>> analytics
  ["POSTHOG_KEY", "analytics"],
  ["POSTHOG_HOST", "analytics for an EU project"],
  // <<< analytics
];
/** Names that follow a pattern: a Stripe price per paid plan. */
const PATTERNS = [/^STRIPE_PRICE_[A-Z0-9_]+$/];

/** Secret names from `wrangler secret list --format json`. */
export function secretNames(output) {
  const start = output.indexOf("[");
  if (start < 0) throw new Error("wrangler did not list the Worker's secrets.");
  return JSON.parse(output.slice(start)).map((secret) => secret.name);
}

/**
 * What to store: every known setting present in `env`, anything in `extra`, and a new
 * signing secret when the Worker has none.
 */
export function secretsToSet({ existing, env = process.env, extra = {}, random = randomBytes }) {
  const values = {};
  if (!existing.includes("BETTER_AUTH_SECRET")) values.BETTER_AUTH_SECRET = random(36).toString("base64");
  for (const name of Object.keys(env)) {
    const known = SETTINGS.some(([setting]) => setting === name) || PATTERNS.some((pattern) => pattern.test(name));
    if (known && env[name]?.trim()) values[name] = env[name].trim();
  }
  return { ...values, ...extra };
}

/** Stores secrets on the Worker and returns the names it now has. */
export function applySecrets(target, account, extra = {}) {
  const existing = secretNames(
    wrangler(["secret", "list", "--name", target.worker, "--format", "json"], { capture: true, account }),
  );
  const values = secretsToSet({ existing, extra });
  if (Object.keys(values).length) {
    wrangler(["secret", "bulk", "--name", target.worker], { input: JSON.stringify(values), capture: true, account });
  }
  return { set: Object.keys(values), have: [...new Set([...existing, ...Object.keys(values)])] };
}

export function report(have) {
  const lines = [];
  for (const [name, what] of SETTINGS)
    lines.push(`  ${have.includes(name) ? "set    " : "not set"} ${name.padEnd(30)} ${what}`);
  return lines.join("\n");
}

async function main(argv) {
  const { product } = await loadProduct();
  const target = targetOf(product, argv[0]);
  const account = await accountOf(cloudflareApi(tokenFrom()));
  const { set, have } = applySecrets(target, account);
  console.log(
    set.length ? `Stored on ${target.worker}: ${set.join(", ")}.` : `Nothing new to store on ${target.worker}.`,
  );
  console.log(
    `\n${report(have)}\n\nTo set one: put it in this shell's environment and run this again. /health on the deployed product shows what is on.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
