// What the surfaces may use. Pages and the Worker import from here; nothing outside this
// package reaches into its folders.
export {
  bindConsent,
  createGrant,
  grantIsActive,
  type PendingConsent,
  readConsent,
  takeConsent,
} from "./accounts/assistants";
export { AUTH_BASE_PATH, type Auth, getAuth } from "./accounts/auth";
export { assistantPrincipal, type Principal, sessionPrincipal } from "./accounts/session";
export type { ApiContext } from "./api/base";
export { apiContext, handleApi, isApiPath, REST_PREFIX, RPC_PREFIX } from "./api/handlers";
export { type Health, health } from "./api/health";
export { type AppRouter, router } from "./api/router";
export { type ServerApi, serverApi } from "./api/server-client";
export { authSettings } from "./core/auth-settings";
export { ConfigError, UserError } from "./core/errors";
export { type Db, getDb, schema } from "./db/client";
export type { Env } from "./env";
export { emailMode, sendEmail } from "./integrations/email/sender";
export { isCrossSiteAuthCallback, isCrossSiteWrite } from "./safety/cross-site";
