// What `npm run remove -- <name>` takes out. For each part:
//
//   paths        folders and files that exist only for it
//   packageJson  entries to drop, per workspace folder and section
//   write        files that take another form once it is gone
//   regenerate   "auth" (sign-in tables), "db" (a migration for dropped tables), "theme"
//
// Lines the part adds to shared files are not listed here: they sit between
// ">>> name" and "<<< name" markers and are found by searching.
//
// tests/removable.test.ts holds this list to the repository: every path exists, and every
// marker in the code names a part listed here. CI removes each part on a fresh copy and
// runs the full check and build (.github/workflows/check.yml).

/** @typedef {{ what: string, paths?: string[], packageJson?: Record<string, Record<string, string[]>>, write?: Record<string, string>, regenerate?: ("auth" | "db" | "theme")[], notes?: string[] }} Part */

/** @type {Record<string, Part>} */
export const PARTS = {
  payments: {
    what: "Stripe subscriptions, the billing page and the plans in the product config",
    paths: [
      "packages/backend/src/modules/payments",
      "apps/web/app/(account)/settings/billing",
      "apps/web/tests/payments.workers.test.ts",
    ],
    packageJson: {
      "packages/backend": { dependencies: ["@better-auth/stripe", "stripe"] },
      "apps/web": { dependencies: ["@better-auth/stripe"] },
    },
    regenerate: ["auth", "db"],
  },
  ai: {
    what: "model calls with a monthly spending cap, and the example at /labs/ai",
    paths: [
      "packages/backend/src/modules/ai",
      "packages/backend/src/db/schema/ai.ts",
      "packages/backend/tests/ai-prices.test.ts",
      "packages/shared/src/schemas/ai.ts",
      "apps/web/app/labs/ai",
      "apps/web/tests/ai.workers.test.ts",
    ],
    packageJson: { "packages/backend": { dependencies: ["@anthropic-ai/sdk"] } },
    regenerate: ["db"],
  },
  analytics: {
    what: "PostHog on web and mobile, the /ingest proxy and the cookie prompt",
    paths: [
      "packages/backend/src/modules/analytics",
      "apps/web/app/_components/Analytics.tsx",
      "apps/web/lib/analytics.ts",
      "apps/web/tests/analytics.workers.test.ts",
      "apps/mobile/src/lib/analytics.tsx",
    ],
    packageJson: {
      "apps/web": { dependencies: ["posthog-js"] },
      "apps/mobile": {
        dependencies: [
          "posthog-react-native",
          "expo-application",
          "expo-device",
          "expo-file-system",
          "expo-localization",
        ],
      },
    },
  },
};
