# Architecture

How the template is put together, and why. `AGENTS.md` has the rules; this is the map.

## One Worker

Every request arrives at one Cloudflare Worker (`apps/web/worker/`). Its router decides who
answers, in this order:

1. `/health` and `/__build` answer at once.
2. The path is normalised (decoded, lowercased, `.rsc` dropped) and matched to an **area** of the
   access map. An internal area needs a verified Cloudflare Access token, or the answer is 404.
3. A write from another site is refused, except where a protocol requires one.
4. The body is capped at 1 MB, and the request's headers are replaced by a trusted set that
   records the origin and how the person is identified.
5. An area that needs a sign-in gets one: pages redirect to `/sign-in`, APIs answer 401.
6. The path is dispatched: MCP and OAuth endpoints, sign-in (`/api/auth/*`, behind a table of
   allowed routes), the API (`/rpc/*` and `/api/*`), a module's own paths, then pages.
7. Every answer leaves with security headers; HTML gets a content security policy with a fresh nonce.

Machine endpoints answer only to the path exactly as written. A spelling the access check had to
decode or lowercase reaches a page's 404, never an API.

## One definition of each action

An action is defined once in `packages/shared/src/contract` (oRPC): its name, description, input
and output. `packages/backend/src/api/router.ts` implements it. From that one definition come:

| Caller                 | Reaches it through                                                          |
| ---------------------- | --------------------------------------------------------------------------- |
| A server-rendered page | `api()` in `apps/web/lib/server.ts`, in-process, no HTTP                    |
| The browser            | the typed client (`createApiClient`), over `/rpc`                           |
| The mobile app         | the same typed client, over `/rpc`                                          |
| Anything else          | REST with an OpenAPI document, over `/api`                                  |
| An assistant           | an MCP tool, when the procedure is listed in `apps/mcp/servers/*/scopes.ts` |

Clients import only the contract's type, so no server code leaves the Worker.

## Who can reach what

`product/product.config.ts` picks an access preset; `packages/shared/src/product/access.ts` turns
it into a map of areas. Each area has two settings that do not depend on each other:

- **visibility**: `public`, or `internal` (only people Cloudflare Access lets through);
- **auth**: `none`, `user` or `admin`.

An internal area also says whose word it takes for who the person is: the Access email
(`identity: "access"`, no second login) or a Better Auth session on top of Access.

| Preset                  | Site     | Product                         | Admin, labs | Sign-up   |
| ----------------------- | -------- | ------------------------------- | ----------- | --------- |
| `private` (the default) | internal | internal, Access is the sign-in | internal    | allowlist |
| `internal-tool`         | internal | internal, Access is the sign-in | internal    | closed    |
| `private-beta`          | public   | internal, own sign-in           | internal    | allowlist |
| `public-product`        | public   | public, own sign-in             | internal    | open      |

Three things read the same map, so they cannot drift apart: the Worker's router, the Cloudflare
Access applications (`scripts/access.mjs` compiles the map into them), and a test that tries every
area of every preset as five kinds of visitor (`apps/web/tests/access.workers.test.ts`).

## Packages

```
packages/shared    the contract, zod schemas, the typed client, the access map. No server code.
packages/backend   everything that touches the database or a secret
packages/theme     the brand: one file, from which everything visual is built
```

The backend is layered; a file imports from its own layer or the ones before it:
`db → core → safety → integrations → accounts → features → modules → api`.
`tests/boundaries.test.ts` enforces this, along with: surfaces do not import each other, only the
backend touches the database, shared code runs anywhere, browser code imports no server code.

## Data

D1 (SQLite) through Drizzle. Tables live in `packages/backend/src/db/schema/`, one file per
feature; `npm run db:generate` writes the SQL; Wrangler applies it. There are no interactive
transactions: writes that must succeed together go in one `db.batch`, and a check that must not
race with its write is one statement (the limits on sign-in attempts work this way).

A table holding a person's data references `auth_user` with `onDelete: "cascade"`, so deleting the
account deletes the data.

## Optional parts

A **surface** is another way into the product beside the web app. A **module** is a capability
that stays off until its keys are set. `npm run remove` lists the ones this copy has.

- `mobile`, a surface: the iOS and Android app, one Expo codebase with the same sign-in and the same typed API (`docs/MOBILE.md`).
- `mcp`, a surface: MCP servers behind OAuth, where an API procedure becomes a tool an assistant can call (`docs/MCP.md`).
- `site`, a surface: the public website, under `apps/web/app/(site)`. Without it the root goes straight to the product.
- `payments`, a module: Better Auth's Stripe plugin, with checkout, the billing portal and signed webhooks. Plans come from the product config, prices from `STRIPE_PRICE_<PLAN>`.
- `ai`, a module: model calls through Anthropic's SDK, by way of Cloudflare AI Gateway when `AI_GATEWAY_URL` is set. A ledger in D1 holds the most a call could cost before it starts and corrects it afterwards, so the monthly budget and each person's share cannot be overshot.
- `analytics`, a module: PostHog. Events go to `/ingest` on the Worker, which passes them on with nothing that identifies the account. No cookie until the visitor allows one.

Each comes out for good with `npm run remove -- <name>`. What makes that possible:

- A module registers itself in `packages/backend/src/modules/index.ts`. The core asks the registry
  what modules add (sign-in plugins and routes, their own paths) and never names one.
- A module is **off until configured**: without its keys its routes do not exist and `/health`
  reports it `off`.
- What a part adds to shared files sits between `>>> name` and `<<< name` markers.
  `scripts/removable.mjs` lists its own files and packages, and what the documents say about it.
- `scripts/check-removal.mjs` proves a removal by doing it on a copy and running the full check
  and build, and by reading the documents afterwards for anything that still names the part.
  Every part passes alone, and together with the others.

## The brand

`packages/theme/src/brand.ts` holds the decisions: colour pairs for light and dark, radii, a
typeface. `npm run theme` builds the Astryx theme for the web from it, then writes the same values
as plain numbers (`src/generated/tokens.ts`) for the contrast tests.
The mobile app reads those numbers too (`packages/theme/src/native.ts`), so it cannot show a different brand.
Nothing else sets a colour.

## Design review

The `impeccable` skill (copied in, `.claude/skills/VENDORED.md`) plans and reviews screens. It is
told what the product and its look are by two generated files, so there is no second copy to keep:

| File                     | Written from                                    | By                       |
| ------------------------ | ----------------------------------------------- | ------------------------ |
| `DESIGN.md`              | `packages/theme/src/brand.ts`, the built theme  | `npm run theme`          |
| `PRODUCT.md`             | `product/brief.md`, `product/product.config.ts` | `npm run design:context` |
| `apps/mobile/PRODUCT.md` | the same, with the app's platform rules         | `npm run design:context` |

`DESIGN.md` carries the brand's values and the template's rules for using them (components only,
no literal colour, one accent), which is what keeps a design pass inside the component library.
The skill's detector then holds pages to it in two places: after each edit to a page (a hook in
`.claude/settings.json`), and in `tests/e2e/design.spec.ts`, which reads every main page as a
browser draws it, at desktop and phone width, signed out and signed in.

## What is deliberately not here

Teams and organisations, queues, file uploads, realtime, API keys. Each is a decision a product
makes for itself; the layout has a place for each (`packages/backend/src/features/`, a new folder
under `apps/`).
