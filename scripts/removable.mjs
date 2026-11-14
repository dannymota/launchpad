// What `npm run remove -- <name>` takes out. For each part:
//
//   paths           folders and files that exist only for it
//   packageJson     entries to drop, per workspace folder and section
//   packageJsonSet  entries that change, per workspace folder and section
//   dropLines       lines to drop from a document or a comment, per file, by the text they
//                   contain (a marker would show in prose)
//   replace         wording to change where a sentence must lose a few words and stay, per
//                   file, as [find, replacement] pairs. Every occurrence is replaced
//   json            entries to drop from other JSON files, per file and key (a key may be a
//                   path into the file: "permissions.allow")
//   write           files that take another form once it is gone
//   regenerate      "auth" (sign-in tables), "db" (a migration for dropped tables, also
//                   applied to the local database), "theme"
//   traces          words that name it. Once it is removed, none may be left in a document
//                   (DOCUMENTS, below). Whole words in their own case, a plural included
//
// Lines the part adds to shared code are not listed here: they sit between ">>> name" and
// "<<< name" markers and are found by searching.
//
// Prose is written so that it can lose a part: what is said about one part sits on a line of
// its own (a sentence, a list item, a table row) and `dropLines` takes the line. `replace` is
// for the rest, and the fewer the better: a sentence that names no part needs neither.
//
// tests/removable.test.ts holds this list to the repository: every path, package entry,
// line and wording it names exists, every marker in the code names a part listed here, and
// after a part's own edits no document holds one of its traces. scripts/check-removal.mjs
// then removes a part on a copy, looks for traces again and runs the full check and build
// (.github/workflows/removal.yml runs it for each part).

/**
 * @typedef {object} Part
 * @property {string} what
 * @property {string[]} [paths]
 * @property {Record<string, Record<string, string[]>>} [packageJson]
 * @property {Record<string, Record<string, Record<string, string>>>} [packageJsonSet]
 * @property {Record<string, string[]>} [dropLines]
 * @property {Record<string, [find: string, replacement: string][]>} [replace]
 * @property {Record<string, Record<string, string[]>>} [json]
 * @property {Record<string, string>} [write]
 * @property {("auth" | "db" | "theme")[]} [regenerate]
 * @property {string[]} [traces]
 * @property {string[]} [notes]
 */

/**
 * The documents that describe the product, by path. Not among them: the original design and
 * the upgrade notes, which are history, and the skills and agents copied in from elsewhere,
 * which are not this repository's to reword.
 */
export const DOCUMENTS = {
  include: [
    /^(README|AGENTS)\.md$/,
    /^docs\/[^/]+\.md$/,
    /^\.claude\/README\.md$/,
    /^\.claude\/(rules|agents)\/[^/]+\.md$/,
    /^\.claude\/skills\/(VENDORED\.md|[^/]+\/SKILL\.md)$/,
  ],
  exclude: [
    /^docs\/(PLAN|UPGRADING)\.md$/,
    /^\.claude\/skills\/(impeccable|unslop-ui|appllama-[^/]+)\//,
    /^\.claude\/agents\/impeccable-/,
  ],
};

/** @type {Record<string, Part>} */
export const PARTS = {
  mobile: {
    what: "the iOS and Android app, with app links, the native theme, the store listings and the Appllama skills",
    paths: [
      "apps/mobile",
      "apps/web/tests/mobile.workers.test.ts",
      "packages/backend/src/api/app-links.ts",
      "packages/shared/src/version.ts",
      "packages/shared/tests/version.test.ts",
      "packages/theme/src/native.ts",
      "scripts/check-listing.mjs",
      "docs/MOBILE.md",
      ".claude/rules/mobile.md",
      ".claude/skills/appllama-app-design-skill",
      ".claude/skills/appllama-usage",
      ".claude/skills/listing",
    ],
    dropLines: {
      "README.md": ["built with Expo", "`/listing`", "docs/MOBILE.md", "for the mobile app"],
      "AGENTS.md": ["apps/mobile ", "`/listing`"],
      "docs/ARCHITECTURE.md": [
        "| The mobile app ",
        "`mobile`, a surface",
        "The mobile app reads those numbers",
        "apps/mobile/PRODUCT.md",
      ],
      "docs/AUTH.md": ["A native app cannot solve Turnstile"],
      ".claude/README.md": ["| `listing` |", "ppllama"],
      ".claude/rules/design.md": ["apps/mobile"],
      ".claude/skills/VENDORED.md": ["ppllama"],
      ".claude/skills/start/SKILL.md": ["- `mobile`:", "A product with a mobile app"],
      ".claude/skills/feature/SKILL.md": ["With the mobile app, a screen", "apps/mobile"],
      ".claude/skills/launch-check/SKILL.md": ["check:listing", "Google Play"],
      ".claude/skills/go-live/SKILL.md": ["**The mobile app**"],
      ".github/workflows/removal.yml": ["          - mobile"],
      ".gitignore": ["# Expo", "apps/mobile/"],
      "packages/backend/src/modules/payments/module.ts": ["the app stores have their own rules"],
      "packages/backend/src/safety/turnstile.ts": ["The mobile app has no widget"],
      "packages/theme/src/brand.ts": ["(native.ts)"],
      "scripts/build-tokens.mjs": ["So does the mobile app"],
      "scripts/new-feature.mjs": ["With the mobile app, it writes a screen"],
    },
    json: {
      ".claude/settings.json": {
        enabledPlugins: ["expo@claude-plugins-official"],
        disabledMcpjsonServers: ["appllama"],
        "permissions.allow": ["Bash(npx expo-doctor*)", "Bash(npx expo export *)"],
      },
      "biome.json": {
        "files.includes": [
          "!apps/mobile/PRODUCT.md",
          "!.claude/skills/appllama-app-design-skill",
          "!.claude/skills/appllama-usage",
        ],
      },
      ".mcp.json": { mcpServers: ["expo", "appllama"] },
      ".claude/launch.json": { configurations: ["mobile preview"] },
    },
    packageJson: {
      ".": { scripts: ["check:listing"] },
      "packages/backend": { dependencies: ["@better-auth/expo"] },
      "packages/shared": { exports: ["./version"] },
      "packages/theme": { exports: ["./native"] },
    },
    traces: [
      "apps/mobile",
      "docs/MOBILE.md",
      "/listing",
      "Appllama",
      "appllama",
      "Expo",
      "mobile app",
      "native app",
      "iOS",
      "Android",
      "App Store",
      "Google Play",
    ],
  },
  site: {
    what: "the public website (landing, pricing, legal): the root then goes straight to the app",
    paths: ["apps/web/app/(site)", ".claude/skills/site"],
    dropLines: {
      "README.md": ["`/site`", "privacy and terms pages"],
      "AGENTS.md": ["`/site`"],
      "docs/ARCHITECTURE.md": ["`site`, a surface"],
      ".claude/README.md": ["| `site` |"],
      ".claude/rules/web.md": ["`(site)/` is the public website"],
      ".claude/skills/start/SKILL.md": ["- `site`:"],
      ".claude/skills/launch-check/SKILL.md": ["privacy and terms pages"],
      ".github/workflows/removal.yml": ["          - site"],
    },
    write: {
      "apps/web/app/page.tsx": `// This product has no public website: the root goes straight to the app.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/app");
}
`,
    },
    traces: ["/site", "(site)", "public website", "privacy and terms"],
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
      ".claude/rules/mcp.md",
    ],
    packageJson: {
      ".": { workspaces: ["apps/mcp"], scripts: ["mcp:test"] },
      "apps/web": { dependencies: ["@app/mcp"] },
      "packages/backend": { dependencies: ["@cloudflare/workers-oauth-provider"] },
    },
    json: {
      "knip.json": { workspaces: ["apps/mcp"] },
      ".claude/settings.json": { "permissions.allow": ["Bash(node scripts/oauth-test.mjs*)"] },
    },
    dropLines: {
      "README.md": ["docs/MCP.md"],
      "AGENTS.md": ["apps/mcp", "mcp:test"],
      "docs/ARCHITECTURE.md": ["apps/mcp", "`mcp`, a surface"],
      "docs/AUTH.md": [
        "The MCP endpoints share",
        "## Assistants (MCP)",
        "An assistant connects with OAuth",
        "Every call checks the assistant's connection",
        "refuses an assistant",
      ],
      ".claude/rules/security-sensitive.md": ["apps/mcp"],
      ".claude/skills/start/SKILL.md": ["- `mcp`:"],
      ".claude/skills/feature/SKILL.md": ["apps/mcp"],
      ".claude/skills/go-live/SKILL.md": ["`https://<domain>/mcp`"],
      ".github/workflows/removal.yml": ["          - mcp"],
      "packages/backend/src/accounts/session.ts": ["An assistant connection (an OAuth grant)"],
      "packages/shared/src/contract/index.ts": ["apps/mcp lists"],
      "scripts/new-feature.mjs": ["// To offer it to assistants"],
    },
    replace: {
      // The order of dispatch is one sentence: it loses its first entry and stays.
      "docs/ARCHITECTURE.md": [
        ["The path is dispatched: MCP and OAuth endpoints, sign-in", "The path is dispatched: sign-in"],
      ],
    },
    regenerate: ["db"],
    traces: [
      "apps/mcp",
      "docs/MCP.md",
      "mcp:test",
      "/mcp",
      "MCP tool",
      "MCP server",
      "MCP endpoint",
      "OAuth",
      "assistant",
    ],
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
    dropLines: {
      "README.md": ["**Payments**, off until", "Stripe keys"],
      "docs/ARCHITECTURE.md": ["`payments`, a module"],
      ".claude/skills/start/SKILL.md": ["- `payments`:", "- `plans`:"],
      ".claude/skills/site/SKILL.md": [
        "| Pricing |",
        "Plans come from `product.plans`",
        "With payments, also that Stripe",
      ],
      ".claude/skills/launch-check/SKILL.md": ["Stripe keys"],
      ".claude/skills/go-live/SKILL.md": ["**Stripe**"],
      ".github/workflows/removal.yml": ["          - payments"],
      "packages/shared/src/product/config.ts": ["A paid plan's Stripe price"],
    },
    regenerate: ["auth", "db"],
    traces: ["Stripe", "payments", "billing"],
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
    dropLines: {
      "README.md": ["**AI**, off until"],
      "docs/ARCHITECTURE.md": ["`ai`, a module"],
      "docs/OPERATIONS.md": ["AI_MONTHLY_BUDGET_USD", "AI calls are capped"],
      ".claude/skills/start/SKILL.md": ["- `ai`:"],
      ".claude/skills/launch-check/SKILL.md": ["The Anthropic key"],
      ".github/workflows/removal.yml": ["          - ai"],
    },
    regenerate: ["db"],
    traces: ["AI", "Anthropic"],
  },
  analytics: {
    what: "PostHog, the /ingest proxy and the cookie prompt",
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
    dropLines: {
      "README.md": ["**Analytics**, off until"],
      "docs/ARCHITECTURE.md": ["`analytics`, a module"],
      ".claude/skills/start/SKILL.md": ["- `analytics`:"],
      ".claude/skills/site/SKILL.md": ["With the analytics module"],
      ".claude/skills/launch-check/SKILL.md": ["The PostHog key"],
      ".github/workflows/removal.yml": ["          - analytics"],
    },
    traces: ["PostHog", "analytics", "/ingest"],
  },
};
