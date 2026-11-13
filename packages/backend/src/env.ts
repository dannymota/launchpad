// The Worker's bindings, variables and secrets, as the backend sees them.
// apps/web/wrangler.jsonc declares the bindings and plain variables; secrets are set with
// `wrangler secret put` (npm run setup does it) and, for local runs, live in apps/web/.dev.vars.
// Optional entries are features that stay off until configured: /health reports each one.
import type { Product } from "@app/shared/product";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

export interface Env {
  /** D1: every table in packages/backend/src/db/schema. */
  DB: D1Database;
  /** KV: OAuth provider state for MCP connections (clients, grants, tokens). */
  OAUTH_KV: KVNamespace;
  /** Static assets built by vinext. */
  ASSETS: Fetcher;
  /** Cloudflare Email Service. Absent in local dev and tests, where mail goes to the outbox table. */
  EMAIL?: { send(message: { from: string; to: string; subject: string; text: string }): Promise<unknown> };
  CF_VERSION_METADATA?: { id: string; tag?: string; timestamp?: string };
  /** Set by the OAuth provider on requests it routes; absent everywhere else. */
  OAUTH_PROVIDER?: OAuthHelpers;
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
  /** The iOS app's bundle id, so tokens from the native Apple sheet are accepted. */
  APPLE_APP_BUNDLE_ID?: string;

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
