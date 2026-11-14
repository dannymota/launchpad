// Cloudflare Turnstile on the form that asks for a sign-in code. On when TURNSTILE_SECRET_KEY
// is set: the form's token must then check out before any mail is sent. /health says so
// under signIn.captcha.
// The mobile app has no widget to get a token from: with Turnstile on it offers Apple and Google only.
import { captchaOn } from "../core/runtime";
import type { Env } from "../env";
import { clientAddress } from "./limits";

export const TURNSTILE_HEADER = "x-turnstile-token";
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** True when Turnstile is off, or the request carries a token Cloudflare confirms. */
export async function passesTurnstile(request: Request, env: Env): Promise<boolean> {
  if (!captchaOn(env)) return true;
  const token = request.headers.get(TURNSTILE_HEADER);
  if (!token || token.length > 2048) return false;
  try {
    const address = clientAddress(request);
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY as string,
        response: token,
        ...(address.includes("/") || address === "unknown" ? {} : { remoteip: address }),
      }),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    // Cloudflare unreachable: refuse rather than send mail unchecked.
    return false;
  }
}
