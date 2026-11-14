// Used only by Better Auth's schema generator, never at runtime:
//   npx auth@1.7.23 generate --config ./auth.cli.ts --output ./src/db/schema/auth.ts --yes
// It mirrors the plugins in src/accounts/auth.ts, with every optional module switched on, so
// the generated tables match everything the app can write.
import "./src/modules";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { authPlugins, authTableOptions } from "./src/core/auth-options";
import { modules } from "./src/core/modules";
import type { Env } from "./src/env";

/** Placeholder settings that switch each module on for the generator. Nothing is ever called with them. */
const everythingOn = new Proxy(
  {},
  { get: (_target, key) => (typeof key === "string" ? "generator-placeholder" : undefined) },
) as Env;

export const auth = betterAuth({
  database: drizzleAdapter({} as never, { provider: "sqlite" }),
  ...authTableOptions,
  plugins: authPlugins({
    sendCode: async () => {},
    extra: modules().flatMap((module) => module.authPlugins?.(everythingOn) ?? []),
  }),
});
