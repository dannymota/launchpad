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
2. Scaffold, with the thing's name in the singular: `renewal`, not `renewals`. For a word whose
   singular ends in "s", say the plural too (`-- status --plural statuses`).

```bash
npm run new:feature -- note
```

3. Make it the product's own, in this order:
   - **Table** (`packages/backend/src/db/schema/<plural>.ts`): real fields. Keep `user_id` with
     `onDelete: "cascade"`. Then `npm run db:redo`, and again after each later change to the
     table, until its migration is committed. The scaffold generated a migration for the table
     as it wrote it; `db:redo` throws away the migrations that are not committed yet, generates
     one from the schema as it is now, and rebuilds the local database from the migrations
     (local data is reset). It asks nothing for a new table. `npm run db:generate` would: it
     compares with the scaffold's migration and asks "created or renamed?" for each column.
     Where there is no terminal it prints `Interactive prompts require a TTY terminal` and
     writes nothing. Never edit or delete a migration by hand (`.claude/rules/database.md` has
     the rest).
   - **Contract** (`packages/shared/src/contract`): inputs, outputs, and a `summary` and
     `description` written for a person reading API docs and a model choosing a tool.
   - **Logic** (`packages/backend/src/features/<plural>.ts`): every query filters by the person's id.
     Rules that can fail throw `UserError` with a message the person can act on, and the procedure
     in `packages/backend/src/api/router.ts` runs the logic inside `userErrors()`, which turns
     that into the API's answer with its status. Without the wrapper the person gets a server
     error. The scaffold has one rule to copy or replace: a limit on how many a person keeps,
     counted in the same statement as the insert, so two requests cannot both take the last place.
   - **Tests** (`apps/web/tests/<plural>.workers.test.ts`): one for each rule, including what must be
     refused: signed out, someone else's record, bad input.
   - **Page** (`apps/web/app/(app)/app/<plural>/`): when the screen is more than a list, agree it
     first with `/impeccable shape <feature>` (a plan, no code). The scaffold wrote the page from
     Astryx's `blank` template: keep that frame (the `Layout`, its header, width and padding) and
     change what is inside it. Find a part with `npx astryx search "<words>"` and read its props
     with `npx astryx component <Name>`. Reach for `npx astryx template <Block>` only for a block
     the page lacks, and do not start over from `npx astryx build`: it proposes a whole page.
     Rows for dense data, not cards. A section under the title is
     `Heading level={3} accessibilityLevel={2}`, as in the scaffold (`.claude/rules/web.md`).
     Deleting asks first, and the scaffold shows how. To look at the page: `npm run build`, then
     `npm run shots -- --only /app/<plural>` (signed in, light and dark, desktop and phone).
     The design test (`tests/e2e/design.spec.ts`) adds a row through the page's form and deletes
     it again: when you change the form or its words, change those lines to match.
     Finish with `/impeccable harden <page>`: empty, loading, error, long text.
   - **Screen** (`apps/mobile/src/app/(app)/<plural>.tsx`): follow `.claude/rules/mobile.md`, and give the tab a title and icon in `_layout.tsx`.
4. Link the page from where a person would look for it (the app home, usually).
5. If assistants should use it, list its procedures in `apps/mcp/servers/main/scopes.ts` with a scope: reads `app:read`, anything that changes data a write scope. When the brief puts assistant tools in a later slice, list them in that slice, not now.

## Gate

The gate is the list in `AGENTS.md` ("Before you say it is done"). Its `npm run e2e` holds the new
page to the design detector with no row and with one: the scaffold added both to
`tests/e2e/design.spec.ts`. A feature adds three things to that list:

- **Apply the migrations locally.** `npm run db:redo` does it as its last step. If the last thing
  you ran was `npm run db:generate`, run `npm run db:migrate:local`.
- **Use it as a signed-in person.** `npm run build`, then run the Worker (`npm start -w @app/web`,
  port 8787): add, see, remove, and try an empty input. Restart the Worker after every
  `npm run build`: one started before the build answers 404 for the page's scripts.
- **The reviewer.** Ask the `reviewer` agent to read the change in a fresh context, fix what it
  finds, and only then report: what works, what you checked, what is left.
