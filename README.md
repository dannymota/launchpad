# Launchpad

A template for starting products. Copy it, describe the idea, and build on a base where sign-in,
the API, an MCP server and the deploy path already work.

**Status: under construction.** Phases 1 and 2 of `docs/PLAN.md` are done: the skeleton, and
sign-in with the access rules that decide who can reach what.

## What works today

- One Cloudflare Worker (vinext) serving pages, sign-in, the API and an MCP server.
- One API definition (oRPC) answering as a typed client, a REST endpoint and an MCP tool.
- **Access in one config.** `product/product.config.ts` picks a preset: `private` (everything behind
  Cloudflare Access, the default before launch), `internal-tool`, `private-beta` or
  `public-product`. Each area of the product is public or internal, and separately needs a sign-in
  or not. The Worker enforces it on every request, and a generated test tries every area of every
  preset as five kinds of visitor.
- **Sign-in.** Before launch the Cloudflare Access email is the sign-in, so there is no second
  login. After launch: an emailed code, and Google and Apple once their keys are set. Signup can be
  open, closed, by allowlist or by email domain. Only the sign-in routes the app uses exist, each
  with attempt limits.
- Account pages: where you are signed in, sign out a device, delete the account. An admin page to
  list and ban accounts, always behind Cloudflare Access.
- Connecting an assistant: OAuth 2.1 with a consent page bound to the signed-in person.
- Checks: Biome, TypeScript, a boundary test for the repo layout, and Workers-runtime tests.

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
`DEV_PRESET=public-product` to `.dev.vars`; sign-in then asks for an emailed code, which you read
from the local outbox:

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
