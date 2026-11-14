# Launchpad

A template for starting products. Copy it, describe the idea, and build on a base where sign-in,
the API, the deploy path and the rules for who can reach what already work. Until launch the
product sits behind Cloudflare Access; going public is a change of one setting.

Stack: Cloudflare Workers and D1, vinext (the Next.js App Router on Vite), Better Auth, oRPC,
Drizzle and Astryx for the web UI.
The mobile app is built with Expo.

## From an idea to a product

Each step is a skill in `.claude/skills/`, run from a Claude Code session in a copy of this
repository. Each writes real files and ends at a check that must pass.

| Step                | What it does                                                                      | Ends at                       |
| ------------------- | --------------------------------------------------------------------------------- | ----------------------------- |
| `/start <idea>`     | Writes the brief and the product config; removes the parts the idea does not need | `check:brief`, then `check`   |
| `/brand`            | Colours, corners and typeface for the whole product, from one file                | `npm run theme:check`         |
| `/feature <name>`   | One slice end to end: table, API, tests and the UI for it                         | `npm run check`               |
| `/site`             | Landing, pricing, FAQ and legal pages from the brief                              | `npm run doctor -w @app/web`  |
| `/listing`          | App Store and Google Play listings, inside each field's limit                     | `npm run check:listing`       |
| `/ship`             | Deploys to staging behind Cloudflare Access and checks it from outside            | `npm run smoke -- staging`    |
| `/launch-check`     | Runs every check; lists what is ready and what waits on you                       | `product/launch-report.md`    |
| `/go-live <domain>` | The domain, the access preset, production                                         | `npm run smoke -- production` |

Almost everything about a product is set in one file, `product/product.config.ts`: its name, its
domains, who can reach which part and how people sign in. The Worker, the pages, the emails and
the deploy scripts all read it.

## What is in it

- **One Worker** serving pages, sign-in, the API and everything else, with one definition of each
  action giving a typed client and a REST endpoint.
- **Access in one map.** Each area of the product is public or internal (Cloudflare Access), and
  separately needs a sign-in or not. Four presets: `private` (the default), `internal-tool`,
  `private-beta`, `public-product`. The Worker, the edge and a generated test all read the same map.
- **Sign-in**: before launch the Cloudflare Access email is the sign-in. After launch: an emailed
  code, and Google and Apple once their keys are set. Sign-up open, closed, by allowlist or by domain.
- **Account pages**: where you are signed in, sign out a device, delete the account. An admin page.
- **An MCP server** (`docs/MCP.md`): any action can be a tool; assistants connect with OAuth, a consent page and a permission per tool.
- **An iOS and Android app** (`docs/MOBILE.md`): one Expo codebase, the same sign-in and the same typed API.
- **Payments**, off until its keys are set: subscriptions through Stripe, with a billing page.
- **AI**, off until its key is set: calls to Claude under a monthly spending cap that cannot be overshot.
- **Analytics**, off until its key is set: PostHog, with no cookie until the visitor allows one.
- **One brand** for the whole product, with contrast tested in light and dark.
- **Protections on every request**: a content security policy with a per-page nonce, refusal of
  writes from other sites, a size limit, rate limits, caps on mail.
- **Everything optional comes out cleanly**: `npm run remove` lists the optional parts, and
  `npm run remove -- <part>` takes one out for good, with what the documents say about it. Each
  removal is proven by doing it on a copy and running the full check and build.
- **A design check on the main pages.** [Impeccable](https://impeccable.style), a design skill
  with a detector, is built in: it plans and reviews screens, and its detector reads the main
  pages, signed out and signed in, as a browser draws them (contrast, text size, heading order,
  the usual marks of a generated page). Each feature you generate is added to that check.
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

Lint, types, unused code, the repository's own rules, and the tests that run on the Workers
runtime. To drive the built product in a real browser as well (a stranger, a sign-in, a sign-out,
and the design detector on the main pages, signed out and signed in):

```bash
npm run e2e
```

## What you still supply

The template cannot know or do these:

- The idea.
- A Cloudflare API token and a Zero Trust organization.
- The people allowed in before launch.
- Before going public: a domain, Google and Apple sign-in keys, and icon artwork.
- Stripe keys and prices, to sell a plan.
- Store accounts and builds, for the mobile app.
- A legal read of the generated privacy and terms pages.

## Where things are

| Read                   | For                                                                          |
| ---------------------- | ---------------------------------------------------------------------------- |
| `AGENTS.md`            | The layout, the commands and the rules. Agents read it first                 |
| `docs/ARCHITECTURE.md` | How it fits together, and why                                                |
| `docs/LAYOUTS.md`      | Page layouts to start from: regions, rules, where to begin, sources          |
| `docs/AUTH.md`         | Sign-in, sign-up, sessions, limits                                           |
| `docs/OPERATIONS.md`   | Shipping, environments, secrets, backups, what to do when something is wrong |
| `docs/MCP.md`          | Connecting assistants over MCP                                               |
| `docs/MOBILE.md`       | The iOS and Android app                                                      |
| `docs/UPGRADING.md`    | Bringing a product up to a newer template                                    |
| `.claude/README.md`    | How the agent is set up: hooks, rules, skills, plugins                       |
| `docs/PLAN.md`         | The original design                                                          |
