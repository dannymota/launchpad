import type { Env } from "../env";

/**
 * True on a developer machine and in tests. Local runs serve plain http and keep mail in
 * the outbox table; a deployed build (staging, production) never does either.
 */
export function isLocalRun(env: Pick<Env, "APP_ENV">): boolean {
  return env.APP_ENV === "local" || env.APP_ENV === "test";
}
