// What `npm run remove -- <name>` takes out. For each part:
//
//   paths           folders and files that exist only for it
//   packageJson     entries to drop, per workspace folder and section
//   packageJsonSet  entries that change, per workspace folder and section
//   dropLines       lines of prose to drop, by the text they contain (a marker would show in a document)
//   json            entries to drop from other JSON files, per file and top-level key
//   write           files that take another form once it is gone
//   regenerate      "auth" (sign-in tables), "db" (a migration for dropped tables), "theme"
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
  mobile: {
    what: "the iOS and Android app, with app links, the native theme and the Appllama skills",
    paths: [
      "apps/mobile",
      "apps/web/tests/mobile.workers.test.ts",
      "packages/backend/src/api/app-links.ts",
      "packages/shared/src/version.ts",
      "packages/shared/tests/version.test.ts",
      "packages/theme/src/native.ts",
      "docs/MOBILE.md",
      ".claude/rules/mobile.md",
      ".claude/skills/appllama-app-design-skill",
      ".claude/skills/appllama-usage",
      ".claude/skills/listing",
    ],
    dropLines: {
      ".claude/skills/VENDORED.md": ["ppllama"],
      "AGENTS.md": ["apps/mobile "],
      ".claude/rules/design.md": ["apps/mobile"],
      "README.md": ["docs/MOBILE.md", "`/listing`"],
      ".github/workflows/removal.yml": ["          - mobile"],
    },
    json: {
      ".claude/settings.json": {
        enabledPlugins: ["expo@claude-plugins-official"],
        disabledMcpjsonServers: ["appllama"],
      },
      ".mcp.json": { mcpServers: ["expo", "appllama"] },
      ".claude/launch.json": { configurations: ["mobile preview"] },
    },
    packageJson: {
      "packages/backend": { dependencies: ["@better-auth/expo"] },
      "packages/shared": { exports: ["./version"] },
      "packages/theme": { exports: ["./native"] },
    },
  },
  site: {
    what: "the public website (landing, pricing, legal): the root then goes straight to the app",
    paths: ["apps/web/app/(site)", ".claude/skills/site"],
    dropLines: { ".github/workflows/removal.yml": ["          - site"], "README.md": ["`/site`"] },
    write: {
      "apps/web/app/page.tsx": `// This product has no public website: the root goes straight to the app.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/app");
}
`,
    },
  },
  mcp: {
    what: "the MCP servers, assistant sign-in (OAuth), the consent page and connected assistants",
    paths: [
      "apps/mcp",
      "apps/web/app/(account)/connect",
      "apps/web/app/(account)/settings/AssistantRows.tsx",
      "apps/web/tests/mcp.workers.test.ts",
      "packages/backend/src/accounts/assistants.ts",
      "packages/backend/src/db/schema/mcp.ts",
      "packages/shared/src/assistant-scopes.ts",
      "scripts/oauth-test.mjs",
      "docs/MCP.md",
    ],
    packageJson: {
      ".": { workspaces: ["apps/mcp"], scripts: ["mcp:test"] },
      "apps/web": { dependencies: ["@app/mcp"] },
      "packages/backend": { dependencies: ["@cloudflare/workers-oauth-provider"] },
    },
    json: { "knip.json": { workspaces: ["apps/mcp"] } },
    dropLines: {
      "AGENTS.md": ["apps/mcp", "mcp:test"],
      "README.md": ["docs/MCP.md"],
      ".github/workflows/removal.yml": ["          - mcp"],
    },
    regenerate: ["db"],
  },
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
    json: { ".claude/settings.json": { enabledPlugins: ["stripe@claude-plugins-official"] } },
    dropLines: { ".github/workflows/removal.yml": ["          - payments"] },
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
    // zod is here only because the Anthropic SDK asks for it; the backend's own schemas live in packages/shared.
    packageJson: { "packages/backend": { dependencies: ["@anthropic-ai/sdk", "zod"] } },
    dropLines: { ".github/workflows/removal.yml": ["          - ai"] },
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
    dropLines: { ".github/workflows/removal.yml": ["          - analytics"] },
  },
};
