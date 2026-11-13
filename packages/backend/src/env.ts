// The Worker's bindings and variables, as the backend sees them. apps/web/wrangler.jsonc
// declares them; `wrangler types` generates a matching global `Env` for the web app.
// Optional entries are features that stay off until configured: /health reports each one.
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

  /** "local" | "staging" | "production". Local and test runs relax Secure cookies and use the outbox. */
  APP_ENV: string;
  /** Signs sessions and codes. At least 32 characters; the app refuses to start without it. */
  BETTER_AUTH_SECRET: string;
  /** The address mail is sent from, on a domain onboarded in Cloudflare Email Service. Empty = no mail. */
  EMAIL_FROM?: string;
}
