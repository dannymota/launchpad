# Operations

Shipping the product, keeping it running, and getting data back. Every command runs from the
repository root.

> The scripts in this file talk to Cloudflare. Their logic is unit tested, but they were written
> without a Cloudflare account to run against. Treat the first run of each as a rehearsal: use
> `staging`, read what it prints, and check the result in the Cloudflare dashboard.

## What you need once

| Thing                               | Where                             | For                                                                                                                                                                                                      |
| ----------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Cloudflare API token              | Dashboard, My Profile, API Tokens | Everything below. Permissions: Workers Scripts Edit, D1 Edit, Workers KV Storage Edit, Account Settings Read, Access: Apps and Policies Edit, Access: Organizations, Identity Providers, and Groups Edit |
| A Zero Trust organization           | Dashboard, Zero Trust             | Cloudflare Access. Free for up to 50 people                                                                                                                                                              |
| The emails allowed in before launch | You                               | The Access policy                                                                                                                                                                                        |

Set the token as `CLOUDFLARE_API_TOKEN` in your shell (and `CLOUDFLARE_ACCOUNT_ID` if it can see
more than one account). In a Claude cloud session, give it through the credential form for
`api.cloudflare.com` and run the commands with `CLOUDFLARE_API_TOKEN=placeholder`. The token is
never written to a file.

## First ship

```bash
npm run config:apply
```

```bash
npm run access:apply -- staging --email you@example.com
```

```bash
npm run deploy -- staging
```

`deploy` runs eight steps and stops at the first that fails:

1. the files generated from the product config are in step with it;
2. Cloudflare Access matches the access map, so nothing internal can be exposed;
3. the full check;
4. the build, for that environment;
5. the database exists, and its migrations are applied;
6. the Worker is deployed;
7. its secrets are set: a signing secret the first time, and where Access is;
8. the deployed product is checked from outside, area by area.

Production is the same with `production`, and the deploy needs the product's slug as a second key:
`npm run deploy -- production --confirm <slug>`.

## Two environments

|             | Staging                                                           | Production                                                       |
| ----------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| Worker      | `<slug>-staging`                                                  | `<slug>`                                                         |
| Database    | `<slug>-staging-db`                                               | `<slug>-db`                                                      |
| Address     | its `workers.dev` address                                         | the domain in `domains.app`, or `workers.dev` until there is one |
| Deployed by | the `deploy-staging` workflow on every push to `main`, or by hand | a person, by hand                                                |

Each has its own secrets and its own Cloudflare Access application.

## Keys for optional features

```bash
npm run setup -- staging
```

stores every setting it knows that is present in the shell's environment, and prints which are
set and what each missing one would turn on (Google and Apple sign-in, Turnstile, Stripe, the AI
key and budgets, PostHog). Values go to Cloudflare through wrangler's standard input.
`/health` on the deployed product shows what is on.

## Taking staging down

For a staging that was only a rehearsal, or one to rebuild from nothing:

```bash
npm run teardown -- staging
```

lists what belongs to it: the Worker, its database, its key-value store, its Access applications.
Add `--confirm <the staging Worker's name>` to delete them, for good. Production is never taken
down by a script.

## Changing who can get in

- **Add or remove people**: `npm run access:apply -- <env> --email a@x.com --email b@y.com`
  (or `--domain example.com`). The list you give replaces the old one.
- **Change the preset or an area**: edit `product/product.config.ts`, then `access:apply`, then
  `deploy`. Access first, so the edge is never looser than the Worker.
- **See what would change**: `npm run access:plan -- <env>`.

## Going live on a domain

The domain must be a zone on the same Cloudflare account. Then follow `/go-live`
(`.claude/skills/go-live/SKILL.md`): it sets `domains.app` and the preset, applies the config,
updates Access, deploys production and lists the redirect URLs to change at Google, Apple and Stripe.

## Looking at a running product

- `https://<address>/health`: the build, the preset, whether Access is set up, which sign-in
  methods and modules are on. Nothing in it is secret.
- `npm run smoke -- <staging|production|https://address>`: each area, as a stranger sees it.
- Logs and traces: the Worker's Observability tab in the Cloudflare dashboard. Logs are JSON with
  an event name; they never hold a token, a code or a request body.
- A new deploy is live when `/__build` returns the new id.

## Backups and restore

Two copies exist:

1. **D1 Time Travel**: 30 days of history, kept by Cloudflare. Use it to undo a bad change:

```bash
npx wrangler d1 time-travel restore <database> --timestamp <unix seconds>
```

2. **The nightly export** (`.github/workflows/backup.yml`): a SQL file, kept for 14 days as a
   workflow artifact. It holds people's data, so the repository must stay private. To restore
   from it, download the artifact and load it into a new database:

```bash
scripts/restore-d1.sh export.sql <slug>-restored
```

The script never writes to the live database. Check the copy, then set `database_name` in
`apps/web/wrangler.jsonc` to it and deploy. Rehearse this once on staging before you need it.

## When something is wrong

| What you see                                        | Likely cause                                                            | Do                                                                      |
| --------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Every internal page is a 404                        | The Worker has no Access settings, or the Access application is missing | `npm run access:check -- <env>`, then `access:apply` and `deploy`       |
| `/health` says Access is not set up                 | The secrets `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are missing           | `npm run deploy -- <env>` sets them                                     |
| Sign-in by email says it is not set up              | No sending domain                                                       | Set `domains.email`, `npm run config:apply`, deploy                     |
| The deploy stops at step 2                          | The access map changed and the edge did not                             | `npm run access:apply -- <env>`                                         |
| A 500 on every request right after the first deploy | The signing secret is not there yet                                     | Wait for step 7 to finish; if it failed, `npm run setup -- <env>`       |
| AI answers "budget used up"                         | The month's cap                                                         | Raise `AI_MONTHLY_BUDGET_USD` with `npm run setup`, or wait for the 1st |

## Costs to know about

- Cloudflare Access: free to 50 people, then per person. It covers testers before launch and the
  people who use an internal tool, not the public.
- Sending email to arbitrary addresses needs a sending domain on Cloudflare and a paid Workers plan.
- AI calls are capped by the ledger; the default is $10 a month in all and $2 a person.
