# Project template: idea in, launch-ready startup out

## Context

Every recent project (pomerance, customerdev, outgif, bizzy, goliath, castle-bee, neuronpool) rebuilds the same
foundations by hand: sign-in, sessions, rate limits, email, security headers, D1 migrations, MCP OAuth, CI.
Each copy differs slightly, and fixes made in one never reach the others.

The goal is one template repo, copied per project, where you describe an idea and, with little customization,
get a product that is deployed and ready to launch, waiting only on its domain. Until launch it sits behind
Cloudflare Access. After that, each part of it can be internal or public, with or without a sign-in. It has a
clear place for each surface: websites, mobile (iOS and Android), MCP servers, and whatever comes next.

Requested stack: Better Auth, vinext, Cloudflare, Astryx. customerdev already runs vinext 1.4 with Astryx 0.7,
so it seeds the web app.

## Decisions

Taken with the owner:

| Decision | Choice |
|---|---|
| Repo structure | One folder per surface (`apps/web`, `apps/mobile`, `apps/mcp`) over a shared backend package. iOS and Android are separate areas inside the mobile app. |
| Access model | Cloudflare Access and Better Auth, as two separate controls. Each area is set as internal or public, and separately as needing a sign-in or not, in one config. |
| API layer | oRPC v2 (beta), provided it passes a proof on the Workers runtime in phase 1. One definition of each action gives the typed client for web and mobile, a REST endpoint and an MCP tool. |
| Database access | The best Cloudflare option: D1 with Drizzle. Migrations are generated from the typed schema and applied by Wrangler, the flow Cloudflare's D1 docs describe. |
| Email and domains | Cloudflare Email Service. The sending domain and the product domain are two settings in the product config, and every other place that needs a domain is filled from them. The sending domain can be one the owner already has, set before the product has its own. |
| Mobile UI | Native Expo app using Expo UI's SwiftUI and Jetpack Compose controls. Colours, type and radii come from the same theme source as the web Astryx theme (Astryx itself is web-only). Appllama's design skill sets the build bar. |
| MCP sign-in | Keep `@cloudflare/workers-oauth-provider`. The consent page reads the Better Auth session. |
| Distribution | Template repo copied per project, laid out so shared parts can become packages later. |
| Optional modules in v1 | Payments (Better Auth's Stripe plugin), AI gateway with budget cap, Analytics (PostHog, off until a key is added). |

Defaults I chose that differ from an existing app. Say so at approval if any should change:

| Default | Differs from | Reason |
|---|---|---|
| Better Auth's routes are mounted at `/api/auth/*`, behind a route table that 404s anything unlisted | bizzy never mounts them | Google and Apple sign-in, the Expo client and OAuth callbacks need the routes |
| Email sign-in uses a one-time code, on web and mobile | outgif and stacklog use magic links; bizzy uses passwords | Mail scanners consume links, and a code works the same in a phone app. Magic link is one plugin to add. |
| A Google or Apple sign-in joins an existing account with the same verified email | bizzy: "email never merges identities" | Otherwise a user who signs in by code on web and Google on mobile gets two accounts. One config line turns it off. |
| In an internal area, the Access identity can stand in for a Better Auth sign-in (chosen per area) | pomerance does this for every user | An internal tool needs no second login, and a product with no domain yet has no email sender or Google and Apple redirect URLs. A public area never accepts it. |
| One Expo codebase builds both iOS and Android; platform-specific code, config and store material sit in separate `ios` and `android` folders | balldog and btv-online are Swift-only | Matches the Expo choice; two fully separate native apps would double the work |
| One Worker serves the website, the API, sign-in and the MCP servers | — | One deploy and one session cookie, as in pomerance. `apps/mcp` is self-contained, so it can move to its own Worker later. |
| Only vendor-maintained agent plugins are enabled. Appllama's design skill is the one third-party skill, copied in at a reviewed commit. Community "startup kits" are mined for ideas, not installed. | — | A plugin runs code with the user's permissions |
| `wrangler.jsonc` and npm; no `cf` CLI | — | `cf` and `cloudflare.config.ts` are still beta |

## From idea to launch-ready

The template ships its own skills in `.claude/skills/`. Each writes real files and ends at a scripted gate.

| Command | What it does | Output | Gate |
|---|---|---|---|
| `/start <idea>` | Short interview: fills in what it can infer, asks only what it cannot, confirms once. Removes the surfaces the idea does not need. | `product/brief.md`, `product/product.config.ts` | `npm run check:brief` |
| `/brand` | Renames the project; generates the palette with Astryx's palette tool; makes icon, favicon and share image | `packages/theme/tokens.ts`, web and mobile assets | theme drift and contrast checks |
| `/feature <name>` | One vertical slice: a Drizzle table with its generated migration, one oRPC procedure with tests (which is the API, the typed client and the MCP tool at once), an Astryx page, a mobile screen | code, started by `npm run new:feature` | `npm run check`, browser test |
| `/site` | Landing, pricing, FAQ and legal pages from the brief; page metadata and sitemap | `apps/web/app/(site)/*` | `astryx doctor`, unslop-ui audit, link check |
| `/listing` | App Store and Play listings within each field's length limit; screenshots from the Maestro flows | `apps/mobile/store.config.json`, `store/ios`, `store/android` | length checks |
| `/ship` | Creates Cloudflare resources, applies migrations, deploys, applies the access map to Cloudflare Access, smoke-tests each area from outside | a deployed URL | internal areas redirect to the Access login; public areas answer |
| `/launch-check` | Runs every gate and lists what is ready and what needs the owner | `product/launch-report.md` | — |
| `/go-live <domain>` | Attaches the domain, updates origins, redirect URLs and app links, switches the access preset (for example `private` to `public-product`) | a live product | the same smoke test on the domain |

**One config file.** `product/product.config.ts` holds the name, slug, tagline, enabled surfaces, brand seed, the
access map, the two domains, sign-in methods, signup mode, plans (a free tier plus one paid plan by default),
legal entity, bundle id and package name, and MCP server name. The setup and access scripts, the Worker, site
pages, emails, `apps/mobile/app.config.ts`, the MCP server and the store listings all read it, so most
customization is editing that one file and running `/feature`.

**Domains set once, used everywhere.** The config has `domains.app` (empty until launch; the `workers.dev`
address stands in) and `domains.email` (the Cloudflare Email Service sending domain, which can be set earlier
and can be a domain you already own). One helper derives everything else from them:

| From `domains.app` | From `domains.email` |
|---|---|
| Worker route, Better Auth base URL and trusted origins, Google and Apple redirect URLs, Cloudflare Access hostnames, MCP resource address, iOS associated domains and Android App Links, sitemap, canonical and share-image URLs, privacy and support URLs in the store listings | Sender address and name, reply-to, support address on legal pages and in the app, links inside emails |

With no sending domain set, email-code sign-in is off, `/health` says so, and internal areas still work through
Access identity sign-in. `/go-live <domain>` fills in `domains.app` and re-runs the readers.

**What the owner still supplies:** the idea and one confirmation, a Cloudflare API token, and before going live
the domain, Google and Apple sign-in keys, Stripe keys, store accounts and a legal read of the generated pages.

## Who can reach what

Cloudflare Access and Better Auth are separate controls, and every area of the product sets both:

| | No sign-in | Sign-in required (Better Auth) |
|---|---|---|
| **Public** | marketing site, legal pages, a waitlist | the customer product, settings, billing |
| **Internal** (Cloudflare Access) | labs, previews, internal docs, a product before launch | admin console, internal tools with roles |

- An area is a path prefix: the site at `/`, the product at `/app`, `/admin`, `/labs`, the API (`/rpc`, `/api`,
  where each procedure states its own area), and the MCP routes. Each has `visibility: 'public' | 'internal'`
  and `auth: 'none' | 'user' | 'admin'`.
- An internal area also chooses its identity: `access` (the Access email signs the person in, with no second
  login) or `session` (Access and a Better Auth sign-in both).
- Who may hold an account is the third setting: signup `closed`, `allowlist`, `domain` or `open`.
- A preset sets all of it at once, and any area can then be overridden:

| Preset | Site | Product | Admin, labs | Signup |
|---|---|---|---|---|
| `private` (default until a domain exists) | internal | internal, Access identity | internal | allowlist |
| `internal-tool` | internal | internal, Access identity | internal | closed |
| `private-beta` | public | internal, sign-in | internal | allowlist |
| `public-product` | public | public, sign-in | internal | open |

- Preview URLs are always internal. MCP routes follow the product by default and can be made public on their
  own, since they are OAuth-protected.
- One map, three enforcers. `scripts/access.mjs` turns it into Cloudflare Access applications at the edge. The
  Worker checks it on every request and answers 404 for an internal area without a verified Access token. A
  generated test matrix tries every area with no credentials, Access only, a session only, and both.
- The deploy script refuses to deploy when the edge does not match the map, so an internal area cannot be
  exposed by accident. `/health` reports the active preset.
- Launching is switching preset: `/go-live` attaches the domain and moves `private` to `public-product` or
  `private-beta`. An internal tool simply stays on `internal-tool`.

## Repo layout

```
product/                      the idea: brief.md, product.config.ts (includes the access map)
apps/                         what people use: one folder per surface
  web/                        websites, and the Worker that serves everything over HTTP
    app/
      (site)/                 public website: landing, pricing, legal, changelog        [removable]
      (app)/                  signed-in web product, served under /app                  [removable]
      (account)/              sign-in, settings, connect/consent  (used by web, mobile and MCP)
      admin/  labs/           internal in every preset
    worker/                   Worker entry and request router
    tests/                    Workers-runtime and browser tests
    vite.config.ts  wrangler.jsonc
  mobile/                     one Expo app, two platforms                               [removable]
    src/
      app/                    screens shared by both platforms (expo-router)
      components/  lib/       shared UI and logic
      platform/
        ios/                  iOS-only code: Apple sign-in, SwiftUI controls, haptics
        android/              Android-only code: Google sign-in, Compose controls, back handling
        index.ios.ts  index.android.ts     the single interface the rest of the app imports
    store/
      ios/                    App Store screenshots and review notes
      android/                Play Store listing and screenshots
    store.config.json         App Store listing as code (EAS Metadata)
    .maestro/                 end-to-end flows: sign-in, main screen, settings
    .eas/workflows/           build, submit and test pipelines per platform
    app.config.ts             shared settings plus separate `ios` and `android` blocks
    eas.json                  build and submit profiles per platform
    (ios/  android/           native projects generated by `expo prebuild`; not committed)
  mcp/                        MCP servers                                               [removable]
    servers/
      main/                   server.ts, scopes.ts   (add a folder per extra server)
    oauth/                    provider, consent, replay guard, client de-duplication
    index.ts                  registry: route → server; the Worker mounts every entry
    tests/
packages/                     what the surfaces share
  backend/                    all server logic: no pages, no React
    src/
      db/schema/              Drizzle tables, one file per feature
      api/                    oRPC procedures implementing the contract
      core → safety → integrations → accounts → features → modules   (import order enforced)
    migrations/               SQL generated by drizzle-kit, applied by Wrangler
    tests/
  shared/                     zod schemas, the oRPC contract, createApiClient()   (no server code)
  theme/                      tokens.ts → Astryx theme (web) and native theme (iOS, Android)
scripts/                      setup, deploy, access, new-feature, remove, smoke, oauth-test, restore-d1
tests/                        repo-wide: boundaries, end-to-end
docs/                         ARCHITECTURE, OPERATIONS, AUTH, MCP, MOBILE, UPGRADING
.claude/                      settings.json, rules/, hooks/, skills/, agents/, launch.json
.github/workflows/            check, deploy-staging, backup
AGENTS.md  CLAUDE.md  .mcp.json  TEMPLATE_VERSION  README.md  package.json
```

Rules that keep it clean, enforced by `tests/boundaries.test.ts`:

- `apps/*` never import from each other, with one exception: `apps/web/worker` mounts `apps/mcp`.
- Only `packages/backend` touches the database. Server-rendered pages call its procedures in-process; browsers,
  the mobile app and MCP clients reach the same procedures over HTTP.
- `apps/mobile` imports only `packages/shared` and `packages/theme`.
- `packages/shared` and `packages/theme` import no React, Next, Cloudflare or Node modules.
- A new surface (browser extension, desktop app, docs site, a second website) is a new folder under `apps/`.

Removing what a project does not need: `npm run remove -- <mobile|mcp|site|payments|ai|analytics>` deletes that
surface or module with its routes, tables, config block and tests. CI removes each one on a copy and runs check
and build, and Knip confirms nothing is left dangling.

Workspaces: root npm workspaces are `apps/web`, `apps/mcp` and `packages/*`. `apps/mobile` keeps its own
lockfile so Expo's exact React and TypeScript pins never constrain the web app (customerdev's
`examples/pulse-mobile` already pins React 19.3.0 against the web app's 19.3.1). Mobile reaches the two shared
packages through `tsconfig` paths and Metro `watchFolders`.

## What the template includes

**Core**

| Area | Contents | Lifted from |
|---|---|---|
| Websites | vinext App Router, Astryx with the Tailwind bridge, light and dark; public site pages and a signed-in app shell | customerdev |
| API | oRPC contract and procedures: typed client with TanStack Query helpers, REST with an OpenAPI document, MCP tools | new |
| Auth | Better Auth on D1: email code, Google, Apple, Turnstile, signup gate, session list and revoke, account deletion | bizzy |
| Access control | The per-area map above, four presets, enforced at the edge, in the Worker and by a test matrix | pomerance |
| Admin | `/admin` users page (list, ban) for Access-verified emails in `ADMIN_EMAILS` | pomerance, customerdev |
| Database | D1 with Drizzle: typed schema, generated migrations applied by Wrangler, retry wrapper | outgif, pomerance |
| Email | Cloudflare Email Service (`send_email` binding) behind one sender, sending domain from the product config, plain-text templates, local outbox for dev and tests, daily cost caps | bizzy, customerdev |
| Abuse controls | D1 keyed limits per IP, email and network; native `ratelimits` bindings; failed sign-in timing floor | bizzy, outgif, goliath |
| Security | Nonce CSP and security headers, cross-site write check, boot-time secret validation, `no-cache` HTML with a `/__build` id | outgif, customerdev, bizzy, castle-bee |
| Observability | Workers Logs and traces with sampling, redacted JSON logs, Analytics Engine events, version metadata, `/health` | outgif, pomerance |
| MCP | One server at `/mcp` over Streamable HTTP, room for more; OAuth with CIMD, Astryx consent page, a scope per tool, replay guard, client de-duplication, "Connected assistants" page | pomerance, goliath |
| Mobile | Expo app for iOS and Android: Expo UI native controls, tabs and modals, onboarding slot, Better Auth Expo client, Apple sign-in on iOS, Google sign-in on Android, deep links, minimum-version check, Maestro flows, EAS pipelines and store folders per platform | stacklog, balldog |
| Environments | local, staging, production; setup script that creates resources and pushes secrets | pomerance, neuronpool |
| Quality gates | Biome, typecheck, Knip, unit tests, Workers-runtime tests, boundary test, access matrix, Playwright smoke test, `astryx doctor`, theme drift check | goliath, outgif, customerdev |
| CI and ops | `check`, `deploy-staging` and nightly D1 backup workflows, restore script, exact version pins, Renovate | goliath, neuronpool |

**Optional modules** (`packages/backend/src/modules/<name>`, registered in one file)

| Module | Contents | Based on |
|---|---|---|
| Payments | Better Auth's Stripe plugin: subscriptions tied to accounts, Checkout, customer portal, verified webhooks, plans from the product config. Web only in v1. | `@better-auth/stripe`; bizzy and outgif billing code kept as the reference for one-off payments |
| AI | Model calls through Cloudflare AI Gateway with a D1 spending ledger and cap; one streaming chat example | bizzy `src/ai-runner.ts`, `usage-ledger.ts` |
| Analytics | PostHog on web, iOS and Android, proxied through the Worker: events, feature flags, error capture. Does nothing until a key is set; no cookies until consent. | PostHog SDKs |

**Left out of v1 (add per project):** teams and organizations, queues and workflows, R2 uploads, realtime
(Durable Objects), push notifications, in-app purchases (RevenueCat is the recommended route), API keys,
browser extension.

**Considered and not adopted:** `better-auth-cloudflare` (small community package; the template passes D1
directly, and KV is too loosely consistent for sessions); Alchemy and Terraform (the pomerance scripts already
cover provisioning); Turborepo (the repo is too small to need task caching); React Email (plain-text emails are
enough); Sentry (PostHog covers errors); Hono (oRPC does the routing).

## Agent setup

Research on agent instruction files shaped this (sources at the end of the section):

- Long context files did not raise task success in two 2026 studies and raised cost by about 20%. The useful
  content was minimal: the tooling to use and the rules that differ from defaults.
- How a file is sized or split made no measurable difference to rule-following, but adherence fell as a session
  went on.

So the template keeps written rules short and turns everything that must hold into a hook, a permission, a test,
a type or a generator.

| Piece | Contents |
|---|---|
| `AGENTS.md` (about 60 lines) | Commands, the layout map, conventions that differ from defaults, hard rules. Root `CLAUDE.md` says "Read AGENTS.md." |
| `.claude/rules/*.md`, loaded by path | `apps/web/app/**`: Astryx rules (written by `astryx init`). `apps/mobile/**`: the Appllama design skill applies, plus an Android note and the platform-folder rule. `packages/backend/migrations/**`: generated, never edited by hand. `packages/backend/src/{core,safety}/**`: tests and a security review required. `apps/mcp/**`: tools come from the contract, each with a scope. |
| Hooks (`.claude/settings.json`) | Session start: install dependencies so checks run in cloud sessions, print the brief and access preset. After each edit: Biome formats that file. On stop: typecheck and boundary test; a failure sends the agent back to work. Before a command: block production deploys that fail the Access check, `npm audit fix --force`, and pushes to other remotes. Before an edit: block changes to applied migrations and secret files. |
| Permissions | Allow the npm scripts, local wrangler and D1, Astryx and Expo checks. Deny reading `.dev.vars` and `.env*`. |
| Generators | `npm run new:feature`, `npm run remove`, `drizzle-kit generate`, `scripts/setup.mjs`: scaffolding done by script, not by prose |
| `.claude/agents/reviewer.md` | Reviews a change against `product/brief.md` and the boundary rules in a fresh context |
| `.claude/launch.json` | Dev-server launch entries for web and mobile (the pattern in four existing repos) |
| `.mcp.json` | Astryx (`https://astryx.atmeta.com/mcp`), Better Auth docs, Cloudflare docs, Expo. Appllama (`https://mcp.appllama.io/mcp`) is listed but off, since it needs a paid Pro account. |

**Plugins enabled at project scope** (vendor-maintained, pinned in `.claude/settings.json`):

| Plugin | Source | Used for |
|---|---|---|
| `cloudflare@cloudflare` | cloudflare/skills | `workers-best-practices`, `wrangler`, `nextjs-on-cloudflare` (vinext), `cloudflare-email-service`, `turnstile-spin`, `cloudflare-one` (Access and service tokens), `web-perf`; also wires the Cloudflare MCP server |
| `auth-skills@better-auth-agent-skills` | better-auth/skills | `best-practices`, `security` |
| `expo@claude-plugins-official` | expo/skills | Expo Router and native UI, dev client, SDK upgrades, `eas-app-stores`, `eas-workflows`, `eas-simulator` |
| `stripe@claude-plugins-official` | stripe/ai | `stripe-best-practices`, `stripe-docs`, `upgrade-stripe`. Removed with the payments module. |
| `superpowers@claude-plugins-official` | obra/superpowers | Feature-level discipline: test-first, systematic debugging, review. neuronpool already has a `docs/superpowers` folder. |

Built into Claude Code and used by the pipeline: `/code-review`, `/security-review`, `/simplify`, `/run`, `/verify`.
Recommended in `docs/` but not enabled: Anthropic's `mcp-builder` and `webapp-testing`, Microsoft's Playwright
CLI skill, Trail of Bits' static-analysis skills.

**Skills in `.claude/skills/`:**

- The eight pipeline commands above, and `upgrade-template` (applies `docs/UPGRADING.md` entries to a copy).
- `unslop-ui`, the owner's skill, for web screens, with an Astryx reference replacing its DaisyUI class map.
- `appllama-app-design-skill` (MIT, from Appllama/appllama-skills), for mobile screens. It is copied in at a
  commit reviewed during the build, because the repo is three months old with one contributor. It works
  without the Appllama MCP.
- `appllama-usage` is copied in too but only acts when the paid Appllama MCP is connected. Then `/start` and
  `/feature` study the top apps in the category before building mobile screens; otherwise they skip that step.

**Ideas borrowed from community kits, without installing them:** an intake file that later steps refuse to run
without (startup-kit); explicit owner-triggered deploy and publish steps (saas-playbook); a launch folder with
store fields held to their length limits (launch-kit); a scripted gate at the end of each phase (pro-launch,
builder-kit).

Sources: arXiv 2602.11988 (context files reduce success, raise cost); ACL REALM 2026 "Do Context Files Help
Coding Agents?"; arXiv 2605.10039 (file structure has no effect, adherence decays in-session); Claude Code docs
on hooks, path-scoped rules, project plugins and plugin security.

## Key designs

### Worker (`apps/web/worker/`)
The template's own router is outermost, as in pomerance `src/index.ts:107-186`. The OAuth provider is built per
request (it needs the origin) and only ever sees its own paths. Order inside `fetch`:

1. Strip internal request headers and bound the body.
2. Answer `/health` and `/__build`.
3. Cross-site write check (customerdev `isCrossSiteWrite`). Exempt exactly: `POST /api/auth/callback/apple`,
   the Stripe webhook under `/api/auth/stripe/`, `/oauth/token`, `/oauth/register`, and the MCP routes.
4. Access map: normalise the path (strip `.rsc`, decode, lowercase, fail closed) and find its area. An
   internal area needs a verified `Cf-Access-Jwt-Assertion` (pomerance `verifyAccessJwt`) or it answers 404.
   An area that needs a sign-in needs a session: pages redirect to sign-in, APIs answer 401.
5. Dispatch by path:
   - MCP routes from `apps/mcp/index.ts`, `/oauth/*`, `/.well-known/oauth-*`, `/authorize` → IP limit, replay
     guard, OAuth provider.
   - `/api/auth/*` → auth route table and limits, then the Better Auth handler.
   - `/rpc/*` and `/api/*` → the oRPC handlers.
   - `/ingest/*` → the PostHog proxy, when the analytics module is present.
   - `/.well-known/apple-app-site-association` and `assetlinks.json` → generated from the product config.
   - everything else → `vinext/server/fetch-handler`, with the CSP nonce passed in a request header.
6. Add security headers, `no-cache` on HTML, and map errors.

A `scheduled` handler prunes expired limits and replay-guard rows.

### API (`packages/shared/src/contract/`, `packages/backend/src/api/`)
- oRPC v2, pinned to an exact beta. The contract (names, descriptions, zod inputs and outputs) lives in
  `packages/shared`; `packages/backend` implements it; clients import only the contract, so no server code
  reaches the browser or the phone.
- One procedure yields three things: a typed call for web and mobile (`createApiClient`, with TanStack Query
  helpers), a REST endpoint in a generated OpenAPI document, and, when marked for MCP, an MCP tool.
- Middleware carries the cross-cutting rules: the area and session check, `requireScope` for MCP calls,
  `requireAdmin`, rate limits, and customerdev's error mapping. The session is looked up once per request.
- Workers needs the `enable_request_signal` flag until the compatibility date reaches 2026-11-17, per oRPC's
  Cloudflare page.
- If the beta fails the phase 1 proof, the fallback is oRPC 1.16 (stable) with a small adapter that registers
  the same procedures as MCP tools. Nothing else in the design changes.

### Database (`packages/backend/src/db/`)
- Drizzle tables live in `db/schema/`, one file per feature, plus the auth tables written by Better Auth's
  generator. `drizzle-kit generate` turns schema changes into SQL in `packages/backend/migrations/`.
- `wrangler d1 migrations apply` applies them locally, on staging and in production, so Wrangler keeps the
  history, takes a backup first and rolls back a failed migration.
- D1 has no interactive transactions. Writes that must succeed together use `db.batch`; the boundary test
  forbids `.transaction(`.
- pomerance's retry wrapper (`src/db-retry.ts`) sits around the D1 binding. Read replication stays off.

### Auth (`packages/backend/src/core/auth.ts`, `auth-settings.ts`)
- `getAuth(env, ctx)` builds the instance per request (a D1 binding belongs to one request), on Better Auth's
  Drizzle adapter. Table and column names are snake_case in the schema, as in bizzy. The adapter checks the
  schema object without querying D1, which removes the 176-statement startup check bizzy had to switch off.
- Kept from bizzy: hashed verification identifiers, redacting logger, telemetry off, refusal to start on a
  missing or short secret.
- Changed from bizzy because the handler is now mounted: `basePath` `/api/auth`; real 30-day sessions with daily
  refresh (bizzy used 300 seconds and deleted them); real request headers passed to `auth.api` calls;
  `trustedOrigins` for the site, the app scheme and `https://appleid.apple.com`; cookie cache off so revocation
  is immediate.
- Plugins: `emailOTP` (hashed codes), `expo`, `captcha` (Turnstile, web forms only), `admin`; `stripe` when the
  payments module is present.
- Providers: Google, and Apple with a client secret signed at runtime from the `.p8` key, so nothing expires
  every six months. Both accept the native apps' token audiences.
- Auth route table (`safety/auth-gate.ts`): each allowed method and path with its limit class. Unlisted
  `/api/auth/*` paths return 404, which keeps bizzy's "only wired flows are reachable". Admin endpoints are
  never listed; `/admin` pages call `auth.api` on the server.
- Limits come from bizzy's `consumeAuthLimit` (per IP, per email, per network per day) plus email cost caps in
  the sender. Better Auth's own limiter stays off, as in bizzy.
- Signup gate: a `user.create.before` hook calls bizzy's `signUpAdmitted`, with modes `closed`, `allowlist`,
  `domain` (new) and `open`. Refused addresses get no email and the same response.
- Access identity sign-in (`accounts/access-session.ts`): only in an internal area set to `identity: 'access'`,
  and only with a verified Access token for this Worker, it finds or creates the user by the Access email and
  issues a normal session, so roles, data ownership and MCP grants work the same either way. The test matrix
  proves every public area refuses it.
- Account deletion needs a fresh sign-in, then revokes assistant grants and sessions and deletes module data.

### MCP (`apps/mcp/`)
- `servers/main/server.ts` builds an MCP server per request and registers every procedure the contract marks
  for MCP, through oRPC's `McpRegistrar` with a filter. Tool names, descriptions and read-only or destructive
  hints come from the contract. Each exposed procedure names a scope in `scopes.ts`; `requireScope` checks the
  grant and answers with pomerance's scope challenge. It ships `whoami` and one example read tool. A second
  server is a second folder plus one line in `index.ts`.
- `oauth/` holds what pomerance proved: provider settings (CIMD and dynamic registration on, 1-hour access
  tokens, 30-day refresh tokens only when `offline_access` is granted), `replay-guard.ts`, `clients.ts`, the
  grant check on the D1 primary, the explicit `authInfo` workaround and the origin allowlist.
- Token props are `{userId, assistantGrantId}` with the Better Auth user id.
- `GET /authorize` runs in the Worker. With no session it redirects to `/sign-in?next=…`. Otherwise it starts
  consent, stores a single-use `consent_identity` row bound to the user, and redirects to the Astryx page
  `/connect/consent`. `POST /authorize` completes it and returns pomerance's HTML handoff instead of a 302.
- `/settings/assistants` lists grants and revokes them.

### Mobile (`apps/mobile/`)
Expo SDK 58 with expo-router, typed routes and React Compiler, following stacklog's shell.

| | iOS | Android |
|---|---|---|
| Code | `src/platform/ios/` | `src/platform/android/` |
| Native controls (Expo UI) | SwiftUI | Jetpack Compose |
| First sign-in option | Sign in with Apple (native sheet) | Sign in with Google (native) |
| Also offered | Google, email code | email code |
| Config | `ios` block: bundle id, associated domains, Apple sign-in entitlement | `android` block: package, App Links intent filters, adaptive icon |
| Look | iOS defaults: system font, 44pt targets, shadows | Material defaults: Roboto, 48dp targets, elevation, ripple |
| Store | `store.config.json` (EAS Metadata), `store/ios/` | `store/android/` |
| Build, test, submit | EAS `ios` profiles and workflows | EAS `android` profiles and workflows |
| Links | `apple-app-site-association` served by the Worker | `assetlinks.json` served by the Worker |

- Screens and logic in `src/app`, `src/components` and `src/lib` are shared and reach platform behaviour only
  through `src/platform`. Data comes through `createApiClient` with the session the Better Auth Expo client
  keeps in SecureStore.
- **Build bar (from Appllama's design skill):** Apple HIG fidelity, semantic colours, native controls,
  navigation that behaves (push or replace, sheets, no way back into a screen that must not be revisited), and
  a strict motion bar. The template adds an Android note because the skill is iOS-centred. Values still come
  from `packages/theme`.
- **Simulator loop.** The core journeys are Maestro flows in `.maestro/`. By default they run on a Mac through
  the Expo MCP server. With a paid Expo plan, which stays optional, they also run from a cloud session on
  Expo's remote simulator and in CI through the EAS Workflows Maestro job. Their screenshots feed `/listing`.
- The shell also has an onboarding slot, settings (sign out, delete account, version footer) and a
  minimum-version check against `/health`, so an old build can be told to update.
- Development builds reach internal areas with an Access service token held in EAS secrets; store builds never
  carry one.

### Theme (`packages/theme/`)
- `tokens.ts` is plain data with no imports: palette ramps, colour roles as `[light, dark]` pairs, radii, type.
- Web: `apps/web/src/themes/<slug>/<slug>Theme.ts` spreads those into Astryx `defineTheme`, and
  `astryx theme build` emits the CSS, as customerdev does.
- Mobile: `scripts/build-native.mjs` reads the built Astryx token map, splits `light-dark()`, resolves `var()`,
  converts rem to px, and writes `generated/native-tokens.ts`. `native.ts` exports `{light, dark}` plus small
  `ios` and `android` override sets, and `useTheme()`.
- CI runs `npm run theme` and fails on any diff, so the themes cannot drift.

### Modules (`packages/backend/src/modules/`)
Each module has a `module.ts` manifest listing its routes, tables, config and tests, which is what
`npm run remove` reads.

| | Payments | AI | Analytics |
|---|---|---|---|
| Pages (in `apps/web/app/`) | `(account)/settings/billing/` | `labs/ai/` | consent banner |
| Tables | the plugin's `subscription` table and a Stripe customer id on the user | `ai_usage_ledger`, `ai_budgets` | none |
| Config | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, plans from the product config | `ai` binding, `AI_GATEWAY_ID`, budget vars | `POSTHOG_KEY`, `POSTHOG_HOST` |

The AI module defaults to the current Claude models through AI Gateway, reserves budget before each call and
settles after it, and refuses calls over the cap.

### Environments and deploy
- `apps/web/wrangler.jsonc` carries no resource ids: D1 is found by name and KV is provisioned by wrangler, as
  in pomerance. `env.staging` is complete (neuronpool's shape). Bindings: `DB`, `OAUTH_KV`, `EMAIL`,
  `ratelimits`, Analytics Engine, `version_metadata`, a daily cron. `migrations_dir` points at
  `packages/backend/migrations`.
- Deploy order is always migrations, `vinext-cloudflare deploy` (with `--env staging` for staging), then the
  deployed smoke script.
- `scripts/setup.mjs` (from pomerance) reads the product config, creates resources with `CI=1`, generates
  secrets and sends them over stdin, and writes `.dev.vars`.
- `scripts/access.mjs` (from pomerance `scripts/configure-access.mjs`) compiles the access map into Cloudflare
  Access applications and has three commands: `access:plan` shows the changes, `access:apply` makes them,
  `access:check` compares the edge with the map. When every area is internal it protects the whole Worker;
  otherwise it protects each internal prefix. It rejects a map the edge cannot express, such as a public root
  with everything else internal and no prefix.

### Testing
| Layer | Tool | Where | Covers |
|---|---|---|---|
| Unit | vitest in Node, `cloudflare:workers` stubbed | `packages/*/tests` | limits, signup gate, route table, theme conversion, product config |
| Workers runtime | `@cloudflare/vitest-pool-workers` with D1 migrations | `apps/web/tests`, `apps/mcp/tests` | procedures, sign-in, sessions, OAuth and consent, replay guard, subscriptions, ledger |
| Access matrix | generated from the access map, run for all four presets | `apps/web/tests` | every area with no credentials, Access only, a session only, and both |
| Boundaries | customerdev's architecture test, extended; Knip | `tests/boundaries.test.ts` | the layout rules, backend layers, no cycles, 700-line cap, no unused files or exports |
| Browser | Playwright against local dev | `tests/e2e` | email-code sign-in via the outbox, protected page, consent, `/labs` hidden |
| MCP | MCP Inspector CLI and `scripts/oauth-test.ts` (from goliath) | — | register → authorize → token → `tools/list` → `whoami` → replay revokes |
| Deployed | `scripts/smoke.ts` | — | `/health`; each area from outside; `/mcp` 401 with resource metadata |
| Mobile | `expo-doctor`, `tsc`, vitest, `expo export` per platform, Maestro flows | `apps/mobile` | config health, types, client logic, both bundles build, core journeys |

### Version pins (exact, checked on npm 2026-11-13)
vinext 1.4.5, @vinext/cloudflare 1.3.4, better-auth, @better-auth/expo and @better-auth/stripe 1.7.23,
@astryxdesign/core and cli 0.7.15, @stylexjs/stylex 0.19.2, the @orpc packages at 2.0.0-beta.50, drizzle-orm
0.45.4, drizzle-kit 0.31.11, @cloudflare/workers-oauth-provider 1.2.4, agents 0.33.0,
@modelcontextprotocol/server 2.4.0, @modelcontextprotocol/inspector 2.15.0, @cloudflare/vite-plugin 1.69.1,
wrangler 4.162.0, vite 8.3.8, react 19.3.1, stripe 23.1.0, posthog-js 1.449.0, zod 4.6.7, tailwindcss 4.3.5,
typescript 7.0.2, vitest 5.1.0, @biomejs/biome 2.6.7, knip 6.45.1. Mobile: expo 58.0.25, react-native 0.88.1,
@expo/ui 58.0.28, posthog-react-native 4.86.0, and the React version `expo install` selects.

## Reuse map (source → template)

| Template path | Seeded from |
|---|---|
| `apps/web/vite.config.ts`, `app/globals.css`, `app/providers.tsx` | customerdev, same paths |
| `apps/web/app/(site)/*` | customerdev `app/{privacy,terms,security,pricing,changelog}`, `robots.ts`, `sitemap.ts` |
| `apps/web/worker/{index,router}.ts` | pomerance `worker/index.ts`, `src/index.ts:107-186` |
| `packages/backend/src/safety/cross-site.ts` | customerdev `worker/index.ts:17-29` |
| `packages/backend/src/safety/headers.ts` | outgif `worker/index.ts`, pomerance `src/page-routing.ts` |
| `packages/backend/src/safety/access.ts`, `accounts/access-session.ts` | pomerance `src/identity.ts` |
| `packages/backend/src/core/auth.ts`, `auth-settings.ts` | bizzy `src/auth-provider.ts`, `src/account-auth.ts:16-54` |
| `packages/backend/src/safety/{auth-limits,signup-gate,turnstile}.ts` | bizzy `src/auth-limits.ts`, `src/signup-gate.ts`; goliath `src/abuse.ts` |
| `packages/backend/src/integrations/email/*` | bizzy `src/email-sender.ts`, `src/auth-email.ts`; customerdev `integrations/email/cloudflare.ts` |
| `packages/backend/src/core/errors.ts`, `db/client.ts` | customerdev `src/server/core/errors.ts`; outgif `db/index.ts`; pomerance `src/db-retry.ts` |
| `packages/backend/src/db/schema/mcp.ts` | pomerance grant, consent and replay tables, rewritten as Drizzle tables |
| `packages/backend/src/modules/ai/*` | bizzy `src/ai-runner.ts`, `src/usage-ledger.ts`, `src/shared/ai-budget.ts` |
| `apps/mcp/oauth/*` | pomerance `src/index.ts:29-106`, `auth.ts`, `oauth-replay-guard.ts`, `assistant-clients.ts` |
| `apps/mobile/src/*`, `eas.json` | stacklog (`src/app`, `src/providers`, `eas.json`); SDK 58 pins from customerdev `examples/pulse-mobile` |
| `apps/mobile/store/ios/*` | balldog `fastlane/`, `scripts/testflight.sh` |
| `tests/boundaries.test.ts`, vitest configs | customerdev `tests/architecture.test.ts`, `vitest.config.ts`; outgif `vitest.workers.config.ts` |
| `scripts/setup.mjs`, `access.mjs`, `deploy.mjs` | pomerance `scripts/setup.mjs`, `configure-access.mjs`; bizzy `scripts/deploy-target.mjs`; neuronpool `deploy.sh` |
| `scripts/smoke.ts`, `scripts/oauth-test.ts`, `biome.json` | goliath |
| `.github/workflows/*`, `scripts/restore-d1.sh` | customerdev `check.yml`, goliath `ci.yml`, neuronpool `deploy-staging.yml` and `backup.yml` |
| `AGENTS.md` hard rules | neuronpool `AGENTS.md` (no outside pull requests without approval), bizzy `AGENTS.md` (ask little, confirm once) |
| `.claude/skills/unslop-ui` | unslop-ui, with an Astryx reference replacing the DaisyUI class map |
| `.claude/skills/appllama-*` | Appllama/appllama-skills at a reviewed commit |

## Build order

Each phase ends with something that runs. The riskiest integration comes first.

0. **Prerequisite (owner):** create an empty private repo named `launchpad` under `dannymota`, so I can attach
   it with push access. No Cloudflare, Google, Apple or Stripe keys are needed to build: every feature runs
   locally and `/health` reports which ones lack keys.
1. **Skeleton and the core proof.** The folder layout with the boundary test; a stripped customerdev web app;
   D1 locally with Drizzle; the Worker with Better Auth, the OAuth provider, oRPC v2 and vinext together; the
   format, stop and session-start hooks, so the rest of the build runs under them. Done when, on the Workers
   runtime: email-code sign-in works through the local outbox; a server-rendered page shows the user; one
   procedure answers over `/rpc`, over `/api` and as an MCP tool; an MCP client completes OAuth through the
   consent page and `whoami` returns that user's id; and a cross-site POST to Apple's callback path is
   accepted. If oRPC v2 fails here, switch to the stable fallback before going further.
2. **Auth hardening and the access map.** Route table and limits, signup modes, Google and Apple configuration,
   session list, account deletion, admin page; the access map with its four presets, the generated matrix test
   and Access identity sign-in.
3. **Worker hardening.** CSP and headers, email caps, `/health` detail, scheduled pruning.
4. **MCP completion.** Scopes, client de-duplication, "Connected assistants" page, Inspector and OAuth tests,
   and a second example server folder to prove the registry.
5. **Theme and mobile.** Token pipeline with the drift check; review and copy in the Appllama skills; Expo app
   with the `ios` and `android` platform folders, Expo UI controls, sign-in and one API call; Maestro flows;
   both platform bundles building.
6. **Modules and removal.** Payments, AI, analytics, then `npm run remove` for every surface and module with
   its CI job.
7. **Agent setup.** `AGENTS.md`, path rules, remaining hooks and permissions, pinned plugins, reviewer agent,
   `unslop-ui` with its Astryx reference.
8. **Idea pipeline.** Product config wired into every reader; `new:feature` generator; setup, access and deploy
   scripts; the eight pipeline skills with their gates.
9. **Finish.** Workflows, backup and restore, docs, then two rehearsals (below). Tag `v0.1.0`.

## Verification

Run here at the end of each phase and before tagging:

1. `npm run check`: Biome, typecheck, Knip, unit tests, Workers-runtime tests, boundary test.
2. `npm run build`, then `astryx doctor --built`, then `wrangler deploy --dry-run` to prove the bundle.
3. `npm run e2e`: Playwright signs in with an email code read from the local outbox, loads a protected page,
   approves an OAuth consent, signs out, and confirms `/labs` returns 404 without an Access token.
4. `npm run mcp:test`: registers a client, completes OAuth, calls `tools/list` and `whoami`, then replays the
   code and expects the grant to be revoked.
5. `npm run theme` leaves no diff. `npm run remove -- <name>` on a copy still passes check and build, for each of
   `mobile`, `mcp`, `site`, `payments`, `ai`, `analytics`.
6. Mobile: `npx expo-doctor`, `tsc`, unit tests, `expo export --platform ios` and `--platform android` both
   bundle, and a web export rendered in Chromium gives a screenshot of the shared sign-in screen.
7. The access matrix passes for all four presets, and `access:plan` prints the expected Cloudflare Access
   applications for each.
8. **Rehearsals of the actual goal.** Copy the template to a fresh folder twice and run the pipeline on two
   different sample ideas: one public web product with an MCP server, one mobile-first private beta. Each must reach a
   passing `/launch-check` where every remaining item is owner-supplied (domain, provider keys, store accounts,
   legal read). I record how many manual edits each needed outside `product/` and the generated features, and
   fix the template until that number is near zero.

Needs the owner, and written into `docs/OPERATIONS.md` and `docs/MOBILE.md` as first-run checklists: a real
`/ship` (I will ask for a Cloudflare API token through the secure form when we reach it), live Google and Apple
sign-in, webhooks sent by Stripe, the Maestro flows on a simulator, and iOS and Android builds on devices.

## Settled, and still to clarify

Settled with the owner: Apple Developer and Google Play accounts exist, so both stores and both native sign-ins
can be tested for real. A paid Expo plan and Appllama Pro stay optional, and everything that uses them has a
path without them. The repo is `dannymota/launchpad`.

Still open. None of these blocks the build; each has a default:

| Question | Default if unanswered |
|---|---|
| Legal entity, contact email and jurisdiction for legal pages and store listings | Asked per project by `/start` |
| Which existing domain new projects send email from before they have their own | Left empty in the template; set per project in `domains.email` |
| Zero Trust team name, default Access allowlist and admin emails | Asked by `/ship` |
| AI provider key and default monthly cap | Claude through AI Gateway, capped at $10 (bizzy's figure) |
| Languages | English only |
| Accounts or teams | Single-user accounts; teams stay out of v1 |
| Superpowers plugin on by default | On |

## Open risks

- **oRPC v2 is a beta**, and its MCP package is three weeks old. It is pinned exactly and proven in phase 1,
  with the stable fallback described above.
- **Unproven wiring, tested in phase 1:** vinext bundling TypeScript source from `packages/backend` and
  `apps/mcp` (fallback: path aliases in `vite.config.ts`); Better Auth handling Apple's cross-site POST
  callback; the consent cookies surviving the redirect to `/connect/consent`.
- **Unproven wiring, tested in phase 5:** `astryx theme build` resolving an import from `packages/theme`
  (fallback: relative import); Metro resolving `tsconfig` paths outside the app root (fallback:
  `resolver.extraNodeModules`); native Google sign-in on Android needing a config plugin and a dev build.
- **The mobile simulator loop cannot run in this environment.** It needs a Mac or Expo's paid cloud simulator.
  Here I can only prove that both bundles build and render the shared screens on web.
- **The Appllama skills are third-party and young.** They are read in full before being copied in, pinned to
  that commit, and scoped to `apps/mobile`. Their research half needs a paid account.
- **Access identity sign-in is a second way in.** It is limited to internal areas that opt in and to a verified
  Access token, and the matrix test proves public areas refuse it.
- **The edge and the code must agree.** Both read the same map; `access:check` runs before every deploy and
  the deployed smoke test probes each area from outside. This can only be fully confirmed on a real deploy.
- **Access matches path prefixes only**, so internal pages need their own prefix. The map compiler rejects
  layouts the edge cannot express.
- **Access has 50 free seats**, which bounds pre-launch testers and the users of an internal tool; past that it
  is $7 per user. Internal-only mobile apps are not covered beyond development builds.
- **Email needs a sending domain on Cloudflare.** Email-code sign-in works once `domains.email` names a domain
  verified in Cloudflare Email Service; sending to arbitrary recipients also needs the Workers Paid plan, and
  the sending feature is still labelled beta. Until then internal areas rely on Access identity sign-in.
- **D1 has no interactive transactions**, which the Stripe plugin and any future plugin must tolerate. The
  Workers-runtime tests exercise the subscription flow on D1.
- **Astryx is beta** (0.7.x) and ships breaking minors with codemods. Pins are exact; upgrades go through
  `astryx upgrade --from <old> --apply`.
- **Better Auth patches often** and only on its latest line. Renovate and `docs/UPGRADING.md` keep copies current.
- **Two stores on MCP:** OAuth tokens live in KV, users in D1. Account deletion and session revocation must
  revoke grants explicitly; a Workers-runtime test covers it.
- **Plugins change upstream.** They are pinned to a commit and reviewed on each bump.
