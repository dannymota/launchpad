// What /health reports: which build is running and which optional features are configured.
// Nothing here is secret; the endpoint is public so a deploy can be checked from outside.

import { productOf } from "../core/product";
import { captchaOn, emailMode, type SignInMethods, signInMethods } from "../core/runtime";
import type { Env } from "../env";
import { accessConfigured } from "../safety/access";

export interface Health {
  ok: true;
  env: string;
  version: string;
  /** "on": real mail. "outbox": the local table. "off": no sending domain, so no email sign-in. */
  email: ReturnType<typeof emailMode>;
  /** The access preset in force, and whether Cloudflare Access is set up to enforce it. */
  access: { preset: string; configured: boolean };
  /** `captcha`: the email-code form needs a Turnstile token, which a native app cannot get. */
  signIn: SignInMethods & { captcha: boolean };
  /** For the native app: builds older than `minVersion` should ask the person to update. Null with no app. */
  mobile: { minVersion: string } | null;
}

export function health(env: Env): Health {
  const product = productOf(env);
  return {
    ok: true,
    env: env.APP_ENV,
    version: env.CF_VERSION_METADATA?.id || "dev",
    email: emailMode(env),
    access: { preset: product.access.preset, configured: accessConfigured(env) },
    signIn: { ...signInMethods(env), captcha: captchaOn(env) },
    mobile: product.mobile ? { minVersion: product.mobile.minVersion } : null,
  };
}
