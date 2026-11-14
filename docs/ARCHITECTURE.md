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

| Caller                      | Reaches it through                                                          |
| --------------------------- | --------------------------------------------------------------------------- |
| A server-rendered page      | `api()` in `apps/web/lib/server.ts`, in-process, no HTTP                    |
| The browser, the mobile app | the typed client (`createApiClient`), over `/rpc`                           |
| Anything else               | REST with an OpenAPI document, over `/api`                                  |
| An AI assistant             | an MCP tool, when the procedure is listed in `apps/mcp/servers/*/scopes.ts` |

Clients import only the contract's type, so no server code reaches a browser or a phone.

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
packages/theme     the brand: one file, from which the web theme and the app's values are built
```

The backend is layered; a file imports from its own layer or the ones before it:
`db → core → safety → integrations → accounts → features → modules → api`.
`tests/boundaries.test.ts` enforces this, along with: surfaces do not import each other, only the
backend touches the database, shared code runs anywhere, browser code imports no server code.

## Data

D1 (SQLite) through Drizzle. Tables live in `packages/backend/src/db/schema/`, one file per
feature; `npm run db:generate` writes the SQL; Wrangler applies it. There are no interactive
transactions: writes that must succeed together go in one `db.batch`, and a check that must not
race with its write is one statement (the AI budget and the attempt limits both work this way).

A table holding a person's data references `auth_user` with `onDelete: "cascade"`, so deleting the
account deletes the data.

## Optional parts

Three **surfaces** (`mobile`, `mcp`, `site`) and three **modules** (`payments`, `ai`, `analytics`)
can each be taken out with `npm run remove -- <name>`.

- A module registers itself in `packages/backend/src/modules/index.ts`. The core asks the registry
  what modules add (sign-in plugins and routes, their own paths) and never names one.
- A module is **off until configured**: without its keys its routes do not exist and `/health`
  reports it `off`.
- What a part adds to shared files sits between `>>> name` and `<<< name` markers.
  `scripts/removable.mjs` lists its own files and packages.
- `scripts/check-removal.mjs` proves a removal by doing it on a copy and running the full check
  and build. All six pass alone and together.

| Module    | What it is                                                                                                                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payments  | Better Auth's Stripe plugin: checkout, the billing portal, signed webhooks. Plans come from the product config, prices from `STRIPE_PRICE_<PLAN>`                                                                                                                |
| AI        | Model calls through Anthropic's SDK, by way of Cloudflare AI Gateway when `AI_GATEWAY_URL` is set. A ledger in D1 holds the most a call could cost before it starts and corrects it afterwards, so the monthly budget and each person's share cannot be overshot |
| Analytics | PostHog on web and mobile. Events go to `/ingest` on the Worker, which passes them on with nothing that identifies the account. No cookie until the visitor allows one                                                                                           |

## The brand

`packages/theme/src/brand.ts` holds the decisions: colour pairs for light and dark, radii, a
typeface. `npm run theme` builds the Astryx theme for the web from it, then writes the same values
as plain numbers (`src/generated/tokens.ts`) for the mobile app and the contrast tests. A page or a
screen never sets a colour.

## What is deliberately not here

Teams and organisations, queues, file uploads, realtime, push notifications, in-app purchases,
API keys. Each is a decision a product makes for itself; the layout has a place for each
(`packages/backend/src/features/`, a new folder under `apps/`).
