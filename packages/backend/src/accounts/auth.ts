// The Better Auth instance. Mounted by the Worker at /api/auth/*.
// It lives in accounts/, not core/, because it sends mail (integrations) and applies
// sign-in limits (safety); core/ holds only the settings and table names it is built from.
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { authPlugins, authTableOptions, CODE_SECONDS } from "../core/auth-options";
import { authSettings } from "../core/auth-settings";
import { getDb, schema } from "../db/client";
import type { Env } from "../env";
import { sendEmail } from "../integrations/email/sender";

export const AUTH_BASE_PATH = "/api/auth";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const SESSION_REFRESH_SECONDS = 60 * 60 * 24;

/** Better Auth's info level writes email addresses, so only the event text at error level is kept. */
function safeLog(level: string, message: string): void {
  console.error(
    JSON.stringify({ event: `auth_${level}`, message: message.replace(/\S+@\S+/g, "[email]").slice(0, 160) }),
  );
}

/**
 * Build one per request: a D1 binding belongs to the request that received it.
 * `origin` is the request's origin, so the same build works on localhost, a preview URL,
 * workers.dev and the product domain without a fixed base URL.
 */
export function getAuth(env: Env, origin: string) {
  const settings = authSettings(env);
  return betterAuth({
    appName: "Launchpad",
    baseURL: origin,
    basePath: AUTH_BASE_PATH,
    secret: settings.secret,
    database: drizzleAdapter(getDb(env), { provider: "sqlite", schema }),
    ...authTableOptions,
    session: { ...authTableOptions.session, expiresIn: SESSION_SECONDS, updateAge: SESSION_REFRESH_SECONDS },
    verification: { ...authTableOptions.verification, storeIdentifier: "hashed" },
    trustedOrigins: [origin],
    telemetry: { enabled: false },
    logger: { level: "error", log: safeLog },
    advanced: { useSecureCookies: settings.secureCookies },
    plugins: authPlugins({
      sendCode: async ({ email, code }) => {
        await sendEmail(env, {
          to: email,
          subject: `Your sign-in code is ${code}`,
          text: `Your sign-in code is ${code}\n\nIt works for ${CODE_SECONDS / 60} minutes. If you did not ask for it, ignore this message.`,
        });
      },
    }),
  });
}

export type Auth = ReturnType<typeof getAuth>;
