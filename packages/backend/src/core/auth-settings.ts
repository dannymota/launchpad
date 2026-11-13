import type { Env } from "../env";
import { ConfigError } from "./errors";
import { isLocalRun } from "./runtime";

const MIN_SECRET_LENGTH = 32;

export interface AuthSettings {
  secret: string;
  /** Local and test runs serve plain http, where Secure cookies would be dropped. */
  secureCookies: boolean;
}

/**
 * Better Auth falls back to a public, hardcoded secret when none is given. Refuse to run
 * rather than sign sessions with a key anyone can read.
 */
export function authSettings(env: Pick<Env, "BETTER_AUTH_SECRET" | "APP_ENV">): AuthSettings {
  const secret = env.BETTER_AUTH_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new ConfigError(`BETTER_AUTH_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters long.`);
  }
  return { secret, secureCookies: !isLocalRun(env) };
}
