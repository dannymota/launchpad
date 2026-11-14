// What the surfaces may use. Pages and the Worker import from here; nothing outside this
// package reaches into its folders.
export {
  type ActiveGrant,
  activeGrant,
  attachProviderGrant,
  bindConsent,
  createGrant,
  endedProviderGrants,
  noteGrantUse,
  type PendingConsent,
  readConsent,
  revokeProviderGrant,
  takeConsent,
} from "./accounts/assistants";
export { AUTH_BASE_PATH, type Auth, getAuth } from "./accounts/auth";
export { assistantPrincipal, type Principal, requestPrincipal } from "./accounts/session";
export { appLinks } from "./api/app-links";
export type { ApiContext } from "./api/base";
export { apiContext, handleApi, isApiPath, REST_PREFIX, RPC_PREFIX } from "./api/handlers";
export { type Health, health } from "./api/health";
export { type AppRouter, router } from "./api/router";
export { runScheduled } from "./api/scheduled";
export { type ServerApi, serverApi } from "./api/server-client";
export { ConfigError, UserError } from "./core/errors";
export { productOf, withProduct } from "./core/product";
export { ORIGIN_HEADER, type RequestFacts, requestFacts, trustedHeaders } from "./core/request";
export { captchaOn, isLocalRun, type SignInMethods, signInMethods } from "./core/runtime";
export { type Db, getDb, schema } from "./db/client";
export type { Env } from "./env";
export { sendEmail } from "./integrations/email/sender";
export { type AccessIdentity, accessConfigured, verifyAccess } from "./safety/access";
export { authGate } from "./safety/auth-gate";
export { isCrossSiteAuthCallback, isCrossSiteWrite } from "./safety/cross-site";
export { bodyLimit, type ResponseContext, secured } from "./safety/headers";
export { clientAddress } from "./safety/limits";
export { TURNSTILE_HEADER } from "./safety/turnstile";
