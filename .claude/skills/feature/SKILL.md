---
name: feature
description: Build one feature of the product end to end. Use when the owner asks for a feature ("/feature notes", "add projects"), or right after /brand to build the main thing from the brief. Scaffolds a working slice (a table, API, tests and the UI for it), then shapes it to the brief.
---

# /feature: one slice, all the way through

A feature here is a vertical slice: a table, the procedures that work on it, tests and a web page.
With the mobile app, a screen there as well.
The scaffold gives you all of it running; your work is the substance.

## Steps

1. Read `product/brief.md`. State in two lines what this feature lets a person do, and what it does
   not do. If the request is bigger than one slice, name the slices and build the first.
2. Scaffold, with the thing's name in the singular:

```bash
npm run new:feature -- note
```

3. Make it the product's own, in this order:
   - **Table** (`packages/backend/src/db/schema/<plural>.ts`): real fields. Keep `user_id` with
     `onDelete: "cascade"`. Then `npm run db:generate`. Never edit a migration by hand.
   - **Contract** (`packages/shared/src/contract`): inputs, outputs, and a `summary` and
     `description` written for a person reading API docs and a model choosing a tool.
   - **Logic** (`packages/backend/src/features/<plural>.ts`): every query filters by the person's id.
     Rules that can fail throw `UserError` with a message the person can act on.
   - **Tests** (`apps/web/tests/<plural>.workers.test.ts`): one for each rule, including what must be
     refused: signed out, someone else's record, bad input.
   - **Page** (`apps/web/app/(app)/app/<plural>/`): when the screen is more than a list, agree it
     first with `/impeccable shape <feature>` (a plan, no code). Then start from
     `npx astryx build "<what the page is for>"` and keep the template's frame. Rows for dense
     data, not cards. Finish with `/impeccable harden <page>`: empty, loading, error, long text.
   - **Screen** (`apps/mobile/src/app/(app)/<plural>.tsx`): follow `.claude/rules/mobile.md`, and give the tab a title and icon in `_layout.tsx`.
4. Link the page from where a person would look for it (the app home, usually).
5. If assistants should use it, list its procedures in `apps/mcp/servers/main/scopes.ts` with a scope: reads `app:read`, anything that changes data a write scope.

## Gate

```bash
npm run db:migrate:local
```

```bash
npm run check
```

```bash
npm run e2e
```

The last one drives the product in a browser and runs the design detector on the main pages and
the new one (the scaffold added it to `tests/e2e/design.spec.ts`). Then run the Worker
(`npm start -w @app/web`) and use the feature as a signed-in person: add, see, remove, and try an
empty input. Ask the `reviewer` agent to
read the change, fix what it finds, and only then report: what works, what you checked, what is left.
