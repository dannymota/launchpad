// The Better Auth instance. Mounted by the Worker at /api/auth/*, behind safety/auth-gate.ts.
// It lives in accounts/, not core/, because it sends mail (integrations) and applies the
// signup gate (safety); core/ holds only the settings and table names it is built from.
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { appleClientSecret } from "../core/apple-secret";
import { authPlugins, authTableOptions, CODE_SECONDS } from "../core/auth-options";
import { authSettings } from "../core/auth-settings";
import { modules } from "../core/modules";
import { productOf } from "../core/product";
import { isLocalRun, signInMethods } from "../core/runtime";
import { getDb, schema } from "../db/client";
import type { Env } from "../env";
import { sendEmail } from "../integrations/email/sender";
import { signUpAdmitted } from "../safety/signup-gate";

export const AUTH_BASE_PATH = "/api/auth";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const SESSION_REFRESH_SECONDS = 60 * 60 * 24;

/** Better Auth's info level writes email addresses, so only the event text at error level is kept. */
function safeLog(level: string, message: string): void {
  console.error(
    JSON.stringify({ event: `auth_${level}`, message: message.replace(/\S+@\S+/g, "[email]").slice(0, 160) }),
  );
}

async function accountExists(env: Env, email: string): Promise<boolean> {
  const [row] = await getDb(env)
    .select({ id: schema.auth_user.id })
    .from(schema.auth_user)
    .where(eq(schema.auth_user.email, email.trim().toLowerCase()))
    .limit(1);
  return Boolean(row);
}

async function socialProviders(env: Env) {
  const methods = signInMethods(env);
  return {
    ...(methods.google
      ? { google: { clientId: env.GOOGLE_CLIENT_ID as string, clientSecret: env.GOOGLE_CLIENT_SECRET as string } }
      : {}),
    ...(methods.apple
      ? {
          apple: {
            clientId: env.APPLE_CLIENT_ID as string,
            clientSecret: await appleClientSecret(env),
            // >>> mobile
            // Lets the token from the native Apple sheet on iOS through: its audience is the app.
            appBundleIdentifier: env.APPLE_APP_BUNDLE_ID,
            // <<< mobile
          },
        }
      : {}),
  };
}

/**
 * Build one per request: a D1 binding belongs to the request that received it.
 * `origin` is the request's origin, so the same build works on localhost, a preview URL,
 * workers.dev and the product domain without a fixed base URL.
 */
export async function getAuth(env: Env, origin: string) {
  const settings = authSettings(env);
  const providers = await socialProviders(env);
  const product = productOf(env);
  return betterAuth({
    appName: product.name,
    baseURL: origin,
    basePath: AUTH_BASE_PATH,
    secret: settings.secret,
    database: drizzleAdapter(getDb(env), { provider: "sqlite", schema }),
    ...authTableOptions,
    session: { ...authTableOptions.session, expiresIn: SESSION_SECONDS, updateAge: SESSION_REFRESH_SECONDS },
    verification: { ...authTableOptions.verification, storeIdentifier: "hashed" },
    account: {
      ...authTableOptions.account,
      // Google or Apple with the same verified email joins the existing account, so a person
      // who used a code on the web and Google on their phone has one account, not two.
      // Remove "enabled" to keep each sign-in method as its own account.
      accountLinking: { enabled: true, trustedProviders: ["google", "apple"] },
    },
    socialProviders: providers,
    // Apple returns the browser with a form POST from its own origin.
    trustedOrigins: [
      origin,
      ...("apple" in providers ? ["https://appleid.apple.com"] : []),
      // >>> mobile
      // The native app is its URL scheme; a development build opened through Expo uses exp:// as well.
      ...(product.mobile ? [`${product.scheme}://`, ...(isLocalRun(env) ? ["exp://"] : [])] : []),
      // <<< mobile
    ],
    // Limits are applied before requests reach Better Auth (safety/auth-gate.ts).
    rateLimit: { enabled: false },
    telemetry: { enabled: false },
    logger: { level: "error", log: safeLog },
    advanced: { useSecureCookies: settings.secureCookies, ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!signUpAdmitted(env, user.email)) {
              throw new APIError("FORBIDDEN", { message: "New accounts are not open yet." });
            }
            return { data: user };
          },
        },
      },
    },
    plugins: authPlugins({
      // What the optional modules add (payments, for one), while each is on.
      extra: modules().flatMap((module) => module.authPlugins?.(env) ?? []),
      sendCode: async ({ email, code }) => {
        // An address that has no account and may not create one gets no mail. The caller sees
        // the same answer either way, so this cannot be used to learn who has an account.
        if (!(await accountExists(env, email)) && !signUpAdmitted(env, email)) return;
        await sendEmail(env, {
          to: email,
          subject: `Your sign-in code is ${code}`,
          text: `Your sign-in code is ${code}\n\nIt works for ${CODE_SECONDS / 60} minutes. If you did not ask for it, ignore this message.`,
        });
      },
    }),
  });
}

export type Auth = Awaited<ReturnType<typeof getAuth>>;
