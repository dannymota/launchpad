// Cloudflare Access, as the Worker checks it. Access sits in front of internal areas at the
// edge and adds a signed token to every request it lets through. The Worker verifies that
// token again, so an internal area stays closed even if the edge rule is missing or wrong.
import { createLocalJWKSet, createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";
import { listOf } from "../core/product";
import type { Env } from "../env";

const TOKEN_HEADER = "cf-access-jwt-assertion";
const TEAM_DOMAIN = /^[a-z0-9-]+\.cloudflareaccess\.com$/;

export interface AccessIdentity {
  /** Null for a service token, which proves it may pass but names no person. */
  email: string | null;
  subject: string;
}

export function accessConfigured(env: Pick<Env, "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD">): boolean {
  return TEAM_DOMAIN.test(env.ACCESS_TEAM_DOMAIN ?? "") && listOf(env.ACCESS_AUD).length > 0;
}

const remoteKeys = new Map<string, JWTVerifyGetKey>();
function keysFor(env: Env, issuer: string): JWTVerifyGetKey {
  if (env.APP_ENV === "test" && env.ACCESS_TEST_JWKS) return createLocalJWKSet(JSON.parse(env.ACCESS_TEST_JWKS));
  let keys = remoteKeys.get(issuer);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    remoteKeys.set(issuer, keys);
  }
  return keys;
}

/**
 * The verified Access identity behind a request, or null. Null means "not let through by
 * Access": no token, a bad one, one for another application, or Access not set up.
 * Only the header Access adds is read, never a cookie, so the edge rule must be in place.
 */
export async function verifyAccess(request: Request, env: Env): Promise<AccessIdentity | null> {
  // A developer machine has no Access in front of it; .dev.vars can name who to be.
  if (env.APP_ENV === "local" && env.DEV_ACCESS_EMAIL) {
    return { email: env.DEV_ACCESS_EMAIL.trim().toLowerCase(), subject: "local-dev" };
  }
  const token = request.headers.get(TOKEN_HEADER);
  if (!token || token.length > 8192 || !accessConfigured(env)) return null;
  const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
  try {
    const { payload } = await jwtVerify(token, keysFor(env, issuer), {
      issuer,
      audience: (env.ACCESS_AUD ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      algorithms: ["RS256"],
      requiredClaims: ["exp", "iat", "sub"],
    });
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    // A service token has an empty subject and a common_name instead of an email.
    const subject = payload.sub || (typeof payload.common_name === "string" ? payload.common_name : "");
    if (!subject) return null;
    return { email: email.includes("@") ? email : null, subject };
  } catch (error) {
    // Says why, never the token, so a renamed team or a changed audience shows up in the logs.
    const reason = (error as { code?: string }).code ?? (error as Error).name;
    console.error(JSON.stringify({ event: "access_token_rejected", reason }));
    return null;
  }
}
