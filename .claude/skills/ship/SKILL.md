---
name: ship
description: Deploy the product to staging on Cloudflare, behind Cloudflare Access. Use when the owner asks to ship, deploy, or put the product online for the first time or again ("/ship"). Sets up Access from the access map, deploys, sets secrets and checks the result from outside. Never deploys to production unless the owner asks for production in this conversation.
---

# /ship: online, and only for the people allowed in

Staging is a full copy of the product on its own Worker, database and address. Ship there first,
every time.

## Before the first ship

1. **A Cloudflare API token.** It needs: Workers Scripts Edit, D1 Edit, Workers KV Storage Edit,
   Account Settings Read, Access: Apps and Policies Edit, and Access: Organizations, Identity
   Providers, and Groups Edit.
   - On the owner's machine, they export `CLOUDFLARE_API_TOKEN` themselves.
   - In GitHub Actions it is the repository secret `CLOUDFLARE_API_TOKEN`; the `deploy-staging`
     workflow uses it.
   - In a cloud session, ask for it with the credential form for the host `api.cloudflare.com`
     (exactly that host), then run commands with `CLOUDFLARE_API_TOKEN=placeholder`: the session's
     proxy puts the real token on each request. Never ask the owner to paste a token into the chat.
     **The deploy itself cannot finish from a cloud session**: the upload of static files needs
     its own short-lived token, which that proxy overwrites, and Cloudflare answers 401. From a
     cloud session, do the planning and checking, then have the owner run the deploy from their
     machine or start the `deploy-staging` workflow. Say this before trying, not after.
2. **A Zero Trust organization** on the Cloudflare account (free for up to 50 people). The access
   script says so if it is missing; only the owner can create it, in the dashboard.
3. **Who may sign in** before launch: ask the owner for the email addresses, or a domain.

## Steps

```bash
npm run config:apply
```

```bash
npm run access:plan -- staging
```

Read the plan back to the owner in one line ("everything on <host> behind Access, for these
people"), then deploy. The first time, name who may sign in:

```bash
npm run deploy -- staging --email owner@example.com
```

Every later deploy is `npm run deploy -- staging`. The first deploy sets Cloudflare Access up
right after the Worker exists, because Cloudflare accepts an Access application for a
`workers.dev` address only then; until it has, the Worker answers 404 for every internal area.
After that, a change to the access map goes to the edge first: `npm run access:apply -- staging`.

The deploy stops by itself if the product config is out of step, if nobody has been named, if
Access does not match the access map, or if a check fails. Do not work around a stop: fix its
cause and run it again. To take a rehearsal staging down again: `npm run teardown -- staging`.

Keys the owner has for optional features (a sign-in provider, a module) are stored with
`npm run setup -- staging`, from the environment. It lists what is set and what each missing one
would turn on.

## Report

The address, what `/health` says (preset, Access set up, which sign-in methods and modules are
on), and the result of the outside check line by line. Say plainly what was not verified.

Production is the same three commands with `production`, and `--confirm <slug>` on the deploy. Run
them only when the owner says "production" or "go live" in this conversation; `/go-live` covers
the domain.
