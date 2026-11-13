import { generateKeyPairSync } from "node:crypto";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Tests that run inside the Workers runtime, against the real router with local D1 and KV.
// The entry is tests/worker-entry.ts: the Worker with a stand-in for the page renderer, so
// these tests need no build. Pages themselves are covered by the browser tests.
const migrations = await readD1Migrations("../../packages/backend/migrations");

// A throwaway key pair that stands in for Cloudflare Access: the Worker checks tokens against
// the public half, and tests sign tokens with the private half (tests/harness.ts).
const accessKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = { ...accessKeys.publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" };
// The same for Sign in with Apple's client secret, which is signed with an ES256 key.
const appleKey = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ format: "pem", type: "pkcs8" });

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./tests/worker-entry.ts",
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: migrations,
          TEST_ACCESS_PRIVATE_JWK: JSON.stringify(accessKeys.privateKey.export({ format: "jwk" })),
          APP_ENV: "test",
          // Fixed, obviously fake values: tests must not depend on .dev.vars.
          BETTER_AUTH_SECRET: "test-only-secret-not-used-anywhere-else-0000",
          ACCESS_TEAM_DOMAIN: "test-team.cloudflareaccess.com",
          ACCESS_AUD: "test-audience-one, test-audience-two",
          ACCESS_TEST_JWKS: JSON.stringify({ keys: [publicJwk] }),
          ADMIN_EMAILS: "admin@example.com",
          SIGNUP_ALLOWLIST: "invited@example.com",
          GOOGLE_CLIENT_ID: "test-google-client",
          GOOGLE_CLIENT_SECRET: "test-google-secret",
          APPLE_CLIENT_ID: "com.example.web",
          APPLE_TEAM_ID: "TESTTEAM01",
          APPLE_KEY_ID: "TESTKEY001",
          APPLE_PRIVATE_KEY: appleKey,
        },
      },
    }),
  ],
  test: {
    include: ["tests/**/*.workers.test.ts"],
  },
});
