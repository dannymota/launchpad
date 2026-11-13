// Facts read straight from the environment: where the Worker is running and which optional
// features have what they need. Each one is on only when its settings are complete.
import type { Env } from "../env";
import { productOf } from "./product";

/**
 * True on a developer machine and in tests. Local runs serve plain http and keep mail in
 * the outbox table; a deployed build (staging, production) never does either.
 */
export function isLocalRun(env: Pick<Env, "APP_ENV">): boolean {
  return env.APP_ENV === "local" || env.APP_ENV === "test";
}

/** "on": real mail. "outbox": the local table. "off": a deployed build with no sending domain. */
export function emailMode(env: Pick<Env, "EMAIL" | "EMAIL_FROM" | "APP_ENV">): "on" | "outbox" | "off" {
  if (env.EMAIL && env.EMAIL_FROM) return "on";
  return isLocalRun(env) ? "outbox" : "off";
}

export interface SignInMethods {
  emailCode: boolean;
  google: boolean;
  apple: boolean;
}

/** True when the sign-in code form is checked by Cloudflare Turnstile. Native apps then cannot ask for codes. */
export function captchaOn(env: Pick<Env, "TURNSTILE_SECRET_KEY" | "TURNSTILE_SITE_KEY">): boolean {
  return Boolean(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY);
}

/** The sign-in methods on offer: chosen in the product config, and only once their settings exist. */
export function signInMethods(env: Env): SignInMethods {
  const product = productOf(env);
  // While the Access email is the sign-in, a Better Auth session would not be honoured anywhere.
  if (product.areas.product.identity === "access") return { emailCode: false, google: false, apple: false };
  const chosen = product.signIn;
  return {
    emailCode: chosen.emailCode && emailMode(env) !== "off",
    google: chosen.google && Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    apple:
      chosen.apple && Boolean(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY),
  };
}
