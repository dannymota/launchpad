// Used only by Better Auth's schema generator (`npm run auth:generate`), never at runtime.
// It mirrors the plugins in src/accounts/auth.ts so the generated tables match what the app writes.
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { authPlugins, authTableOptions } from "./src/core/auth-options";

export const auth = betterAuth({
  database: drizzleAdapter({} as never, { provider: "sqlite" }),
  ...authTableOptions,
  plugins: authPlugins({ sendCode: async () => {} }),
});
