# Launchpad

A template for starting products. Copy it, describe the idea, and build on a base where sign-in,
the API, an MCP server and the deploy path already work.

**Status: under construction.** Phase 1 of `docs/PLAN.md` is done: the skeleton and the proof that
the core pieces work together on the Workers runtime.

## What works today

- One Cloudflare Worker (vinext) serving pages, sign-in, the API and an MCP server.
- Email-code sign-in with Better Auth on D1. Locally the code is written to an outbox table.
- One API definition (oRPC) answering as a typed client, a REST endpoint and an MCP tool.
- Connecting an assistant: OAuth 2.1 with a consent page bound to the signed-in person.
- Checks: Biome, TypeScript, a boundary test for the repo layout, and Workers-runtime tests.

## Run it

```bash
npm install
```

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
```

Put any random string of 32 or more characters in `apps/web/.dev.vars`, then:

```bash
npm run db:migrate:local
```

```bash
npm run dev
```

Open the address it prints, choose Sign in, and enter any email address. The code is in the local
outbox:

```bash
cd apps/web && npx wrangler d1 execute DB --local --command "select subject from email_outbox order by id desc limit 1"
```

## Check it

```bash
npm run check
```

To check the assistant connection end to end, build and start the Worker, then run the script in
a second terminal:

```bash
npm run build && npm start -w @app/web
```

```bash
npm run mcp:test
```

## Where things are

See `AGENTS.md` for the layout and the rules, and `docs/PLAN.md` for the full design and what is
still to come.
