// Sign in with Apple wants a client secret that is a short-lived token signed with the
// team's .p8 key. Signing it here, when needed, means nothing has to be rotated by hand
// every six months.
import { importPKCS8, SignJWT } from "jose";
import type { Env } from "../env";

const LIFETIME_SECONDS = 60 * 60;
let cached: { key: string; secret: string; expiresAt: number } | undefined;

export async function appleClientSecret(
  env: Pick<Env, "APPLE_CLIENT_ID" | "APPLE_TEAM_ID" | "APPLE_KEY_ID" | "APPLE_PRIVATE_KEY">,
): Promise<string> {
  const { APPLE_CLIENT_ID: clientId, APPLE_TEAM_ID: teamId, APPLE_KEY_ID: keyId, APPLE_PRIVATE_KEY: pem } = env;
  if (!clientId || !teamId || !keyId || !pem) throw new Error("Sign in with Apple is not configured.");
  const now = Math.floor(Date.now() / 1000);
  const cacheKey = `${clientId}:${teamId}:${keyId}`;
  if (cached && cached.key === cacheKey && cached.expiresAt - 300 > now) return cached.secret;
  // A secret pasted on one line keeps its line breaks as "\n".
  const key = await importPKCS8(pem.replace(/\\n/g, "\n"), "ES256");
  const secret = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + LIFETIME_SECONDS)
    .sign(key);
  cached = { key: cacheKey, secret, expiresAt: now + LIFETIME_SECONDS };
  return secret;
}
