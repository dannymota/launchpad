// The Worker's bindings, variables and secrets, as the backend sees them.
// apps/web/wrangler.jsonc declares the bindings and plain variables; secrets are set with
// `wrangler secret put` (npm run setup does it) and, for local runs, live in apps/web/.dev.vars.
// Optional entries are features that stay off until configured: /health reports each one.
import type { Product } from "@app/shared/product";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

export interface Env {
  /** D1: every table in packages/backend/src/db/schema. */
  DB: D1Database;
  // >>> mcp
  /** KV: OAuth provider state for MCP connections (clients, grants, tokens). */
  OAUTH_KV: KVNamespace;
  // <<< mcp
  /** Static assets built by vinext. */
  ASSETS: Fetcher;
  /** Cloudflare Email Service. Absent in local dev and tests, where mail goes to the outbox table. */
  EMAIL?: { send(message: { from: string; to: string; subject: string; text: string }): Promise<unknown> };
  CF_VERSION_METADATA?: { id: string; tag?: string; timestamp?: string };
  // >>> mcp
  /** Set by the OAuth provider on requests it routes; absent everywhere else. */
  OAUTH_PROVIDER?: OAuthHelpers;
  // <<< mcp
  /** Set by the Worker's router for the request. Absent = the repo's product/product.config.ts. */
  PRODUCT?: Product;

  /**
   * "production" | "staging" in wrangler.jsonc. "local" comes only from .dev.vars and "test"
   * only from the test config, so a deployed Worker can never run in a local mode.
   */
  APP_ENV: string;
  /** Signs sessions and codes. At least 32 characters; the app refuses to start without it. */
  BETTER_AUTH_SECRET: string;
  /** The address mail is sent from, on a domain onboarded in Cloudflare Email Service. Empty = no mail. */
  EMAIL_FROM?: string;

  /** Cloudflare Access: the team's domain, e.g. "acme.cloudflareaccess.com". */
  ACCESS_TEAM_DOMAIN?: string;
  /** Cloudflare Access: the audience tags of this Worker's applications, comma-separated. */
  ACCESS_AUD?: string;
  /** Emails that are admins when verified by Cloudflare Access, comma-separated. */
  ADMIN_EMAILS?: string;
  /** Emails that may create an account while signup is "allowlist", comma-separated. */
  SIGNUP_ALLOWLIST?: string;

  /** Sign in with Google. Both set = on. */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Sign in with Apple: the Services ID, team, key id and the .p8 key's contents. All set = on. */
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
  // >>> mobile
  /** The iOS app's bundle id, so tokens from the native Apple sheet are accepted. */
  APPLE_APP_BUNDLE_ID?: string;
  /** SHA-256 fingerprints of the keys that sign the Android app, comma-separated, for App Links. */
  ANDROID_CERT_SHA256?: string;
  // <<< mobile

  // >>> payments
  /** Payments (Stripe). Both set = on. Each paid plan's price is STRIPE_PRICE_<PLAN ID>, e.g. STRIPE_PRICE_PRO. */
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  // <<< payments

  // >>> ai
  /** AI (Claude). The key set = on. Calls stop once the month's budget is spent. */
  ANTHROPIC_API_KEY?: string;
  /** Send calls through Cloudflare AI Gateway: its Anthropic endpoint, "https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/anthropic". */
  AI_GATEWAY_URL?: string;
  /** The gateway's token, when the gateway requires one. */
  AI_GATEWAY_TOKEN?: string;
  /** The model to call. Default "claude-opus-5-5". */
  AI_MODEL?: string;
  /** Dollars the whole product may spend on model calls in a calendar month. Default 10. */
  AI_MONTHLY_BUDGET_USD?: string;
  /** Dollars one person may spend of that in a month. Default 2. */
  AI_PERSON_MONTHLY_BUDGET_USD?: string;
  // <<< ai

  // >>> analytics
  /** Analytics (PostHog): the project's API key, "phc_...". Set = on. It is public: every visitor's browser gets it. */
  POSTHOG_KEY?: string;
  /** Where PostHog takes events. Default "https://us.i.posthog.com"; use "https://eu.i.posthog.com" for an EU project. */
  POSTHOG_HOST?: string;
  // <<< analytics

  /** Cloudflare Turnstile on the sign-in code form. Both set = on. The site key is public. */
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  /** A per-client request limit for the API and MCP endpoints, counted at the edge. */
  API_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };

  /** Local runs only: treat every request as this Cloudflare Access email. Ignored when deployed. */
  DEV_ACCESS_EMAIL?: string;
  /** Local runs only: try another access preset ("public-product", ...) without editing the config. */
  DEV_PRESET?: string;
  /** Tests only: the public keys Access tokens are checked against, as a JWKS. Ignored when deployed. */
  ACCESS_TEST_JWKS?: string;
}
