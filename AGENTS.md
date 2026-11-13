# Launchpad

A template for new products: one Cloudflare Worker serving the website, sign-in, the API and
MCP servers, with a place for a mobile app. Copy it per project. `docs/PLAN.md` is the design.

## Commands

| Command                                      | What it does                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                                | Web app on the Workers runtime, with local D1 and KV                         |
| `npm run check`                              | Lint, typecheck, boundary test, Workers-runtime tests. Run before finishing. |
| `npm run format`                             | Biome: format and fix                                                        |
| `npm run db:generate`                        | Turn schema changes into a migration (drizzle-kit)                           |
| `npm run db:migrate:local`                   | Apply migrations to the local database                                       |
| `npm run build` then `npm start -w @app/web` | Build, then run the built Worker on port 8787                                |
| `npm run mcp:test`                           | End-to-end OAuth and MCP check against the running local Worker              |

Local runs read `apps/web/.dev.vars` (created at session start). `DEV_ACCESS_EMAIL` stands in for
Cloudflare Access; `DEV_PRESET=public-product` tries the launched setup, where sign-in is an emailed
code that lands in the `email_outbox` table instead of being sent.

## Layout

```
product/          product.config.ts: name, domains, access preset, signup mode, sign-in methods
apps/web          pages (vinext, Astryx) and worker/: the one Worker that serves every request
apps/mcp          MCP servers and the OAuth provider in front of them
packages/backend  all server logic: db/ core/ safety/ integrations/ accounts/ features/ modules/ api/
packages/shared   zod schemas, the API contract, the typed client, the access map. Runs anywhere.
scripts/ tests/ docs/
```

## Rules that differ from defaults

- **One action, defined once.** Add a procedure to `packages/shared/src/contract`, implement it in
  `packages/backend/src/api/router.ts`. That gives the typed client, the REST endpoint and, once
  listed in `apps/mcp/servers/main/scopes.ts`, an MCP tool (`docs/MCP.md`). Do not add route
  handlers under `app/api`.
- **Every path belongs to an area** with two settings: public or internal (Cloudflare Access), and
  whether it needs a sign-in (`packages/shared/src/product/access.ts`). A page outside `/app`,
  `/settings`, `/admin` and `/labs` is part of the site, which is public after launch. Unfinished
  pages go under `/labs`; admin pages under `/admin`. In the contract, `public.*` is what the public
  site calls and `admin.*` is admin-only; their REST paths start with `/public/` and `/admin/`.
- **Ask who the person is in one way.** Pages: `requireUser()` or `pagePrincipal()`. Procedures: the
  `signedIn`, `inPerson` or `adminOnly` middleware. Never read cookies or Access headers yourself.
- **A table that holds a person's data references `auth_user` with `onDelete: "cascade"`**, so
  deleting the account deletes it.
- **Only `packages/backend` touches the database**, and other code imports it only as `@app/backend`.
  Pages call `api()` from `apps/web/lib/server.ts`; browsers use `createApiClient`.
- **Backend layers import downward only**: `db → core → safety → integrations → accounts → features →
  modules → api`. `tests/boundaries.test.ts` enforces this and the other layout rules.
- **D1 has no interactive transactions.** Use `db.batch([...])` for writes that must succeed together.
- **Migrations are generated.** Edit `packages/backend/src/db/schema/*`, run `npm run db:generate`.
  Never edit or delete an applied file in `packages/backend/migrations`. `schema/auth.ts` is generated
  by Better Auth: `npx auth@1.7.23 generate --config ./auth.cli.ts --output ./src/db/schema/auth.ts`.
- **Web UI is Astryx.** Start pages from `npx astryx template`, read props with `npx astryx component
  <Name>`. No `<div>`, no `style={{}}`, no raw hex or px. Run these from `apps/web`.
- **New request paths go through `apps/web/worker/router.ts`.** Writes from other sites are refused
  there; add an exemption only for a protocol that requires one, with a test.
- **Versions are pinned exactly.** Add a dependency with `npm install --save-exact`.

## Hard rules

- Never read, print or commit `.dev.vars`, `.env*` or any credential. Secrets are Worker secrets.
- Never deploy to production, or change Cloudflare Access, without the owner asking in this session.
- Never open a pull request against a repository the owner does not own.
- Never weaken a check to make it pass. Fix the code, or say what is blocked.
