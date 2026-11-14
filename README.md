# Launchpad

A template for starting products. Copy it, describe the idea, and build on a base where sign-in,
the API, the deploy path and the rules for who can reach what already work. Until launch the
product sits behind Cloudflare Access; going public is a change of one setting.

Stack: Cloudflare Workers and D1, vinext (the Next.js App Router on Vite), Better Auth, oRPC,
Drizzle, Astryx for the web UI, Expo for the app.

## From an idea to a product

Each step is a skill in `.claude/skills/`, run from a Claude Code session in a copy of this
repository. Each writes real files and ends at a check that must pass.

| Step                | What it does                                                                      | Ends at                       |
| ------------------- | --------------------------------------------------------------------------------- | ----------------------------- |
| `/start <idea>`     | Writes the brief and the product config; removes the parts the idea does not need | `npm run check:brief`         |
| `/brand`            | Colours, corners and typeface, from one file, for web and app                     | `npm run theme:check`         |
| `/feature <name>`   | One slice end to end: table, API, tests, page, screen                             | `npm run check`               |
| `/site`             | Landing, pricing, FAQ and legal pages from the brief                              | `npm run doctor -w @app/web`  |
| `/listing`          | App Store and Google Play listings, inside each field's limit                     | `npm run check:listing`       |
| `/ship`             | Deploys to staging behind Cloudflare Access and checks it from outside            | `npm run smoke -- staging`    |
| `/launch-check`     | Runs every check; lists what is ready and what waits on you                       | `product/launch-report.md`    |
| `/go-live <domain>` | The domain, the access preset, production                                         | `npm run smoke -- production` |

Almost everything about a product is set in one file, `product/product.config.ts`: its name, its
domains, who can reach which part, how people sign in, its plans. The Worker, the pages, the
emails, the app and the deploy scripts all read it.

## What is in it

- **One Worker** serving pages, sign-in, the API and everything else, with one definition of each
  action giving a typed client, a REST endpoint and an MCP tool.
- **Access in one map.** Each area of the product is public or internal (Cloudflare Access), and
  separately needs a sign-in or not. Four presets: `private` (the default), `internal-tool`,
  `private-beta`, `public-product`. The Worker, the edge and a generated test all read the same map.
- **Sign-in**: before launch the Cloudflare Access email is the sign-in. After launch: an emailed
  code, and Google and Apple once their keys are set. Sign-up open, closed, by allowlist or by domain.
- **Account pages**: where you are signed in, sign out a device, delete the account. An admin page.
- **An MCP server** (`docs/MCP.md`): assistants connect with OAuth, a consent page and a permission per tool.
- **An iOS and Android app** (`docs/MOBILE.md`): one Expo codebase, the same sign-in and the same typed API.
- **Three optional modules**, each off until its keys are set: payments (Stripe), AI (Claude, with
  a monthly spending cap that cannot be overshot), analytics (PostHog, no cookie until allowed).
- **One brand** for web and app, with contrast tested in light and dark.
- **Protections on every request**: a content security policy with a per-page nonce, refusal of
  writes from other sites, a size limit, rate limits, caps on mail.
- **Everything optional comes out cleanly**: `npm run remove -- <mobile|mcp|site|payments|ai|analytics>`.
  Each removal is proven by doing it on a copy and running the full check and build.
- **An agent set up to work here**: short rules, a guard hook, a reviewer, and the skills above.

## Run it

```bash
npm install
```

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
```

Put any random string of 32 or more characters after `BETTER_AUTH_SECRET=` in `apps/web/.dev.vars`
(a Claude Code session does both steps for you), then:

```bash
npm run db:migrate:local
```

```bash
npm run dev
```

Open the address it prints. The default preset is `private`, so the whole product is internal, and
on your machine `DEV_ACCESS_EMAIL` from `.dev.vars` plays the part of Cloudflare Access: you are
signed in as that address. To try the product as it will be after launch, add
`DEV_PRESET=public-product` to `.dev.vars`; sign-in then asks for an emailed code, which lands in
the local `email_outbox` table instead of being sent.

## Check it

```bash
npm run check
```

Lint, types, the repository's own rules, and the tests that run on the Workers runtime.

## What you still supply

The template cannot know or do these: the idea; a Cloudflare API token and a Zero Trust
organization; the people allowed in before launch; and, before going public, a domain, Google and
Apple sign-in keys, Stripe keys, store accounts and builds, icon artwork, and a legal read of the
generated privacy and terms pages.

## Where things are

| Read                   | For                                                                          |
| ---------------------- | ---------------------------------------------------------------------------- |
| `AGENTS.md`            | The layout, the commands and the rules. Agents read it first                 |
| `docs/ARCHITECTURE.md` | How it fits together, and why                                                |
| `docs/AUTH.md`         | Sign-in, sign-up, sessions, limits                                           |
| `docs/OPERATIONS.md`   | Shipping, environments, secrets, backups, what to do when something is wrong |
| `docs/MCP.md`          | Connecting AI assistants                                                     |
| `docs/MOBILE.md`       | The iOS and Android app                                                      |
| `docs/UPGRADING.md`    | Bringing a product up to a newer template                                    |
| `.claude/README.md`    | How the agent is set up: hooks, rules, skills, plugins                       |
| `docs/PLAN.md`         | The original design                                                          |
