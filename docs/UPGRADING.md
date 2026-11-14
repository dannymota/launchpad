# Upgrading a product made from this template

A product is a copy of the template, not a fork. When the template changes in a way a copy may
want, the change is recorded here, newest first. `TEMPLATE_VERSION` in a product says which
version it was made from or last upgraded to. To upgrade, apply the entries above that version,
oldest first; the `upgrade-template` skill does it step by step.

Each entry says what changed, why a product would want it, and how to apply it by hand. An entry
marked **security** should not be skipped.

## 0.2.0

### Sign-in keeps what is typed before the page is ready

On a slow connection the sign-in form is on screen before its code runs. An address typed in that
moment was shown but not used, so "Send code" stayed off; pressing Enter reloaded the page and
forgot where the person was going.

How to apply it:

1. Copy `apps/web/lib/early-input.ts`.
2. In `apps/web/app/(account)/sign-in/SignInForm.tsx`: `const emailField = useEarlyInput(setEmail);`,
   `ref={emailField}` on the email field, and `<input type="hidden" name="next" value={next} />`
   as the form's first child.
3. Give every other text field on a server-rendered page the same hook (the pages
   `npm run new:feature` wrote have one field each).
4. Copy the last two tests of `tests/e2e/product.spec.ts`, and `tests/e2e/outbox.ts`.
5. In `apps/web/app/(account)/settings/page.tsx`, the section headings take
   `accessibilityLevel={2}`, and every `EmptyState` that sits right under a page title takes
   `headingLevel={2}` (admin, labs, and each page `npm run new:feature` wrote): both followed the
   page title two levels down.

### Impeccable, a design skill with a detector

Plans and reviews screens, and checks each page as a browser draws it. A product wants it for the
detector alone: it found the heading slip above on its first run.

How to apply it:

1. Copy `.claude/skills/impeccable/`, `.claude/agents/impeccable-*.md`, `.claude/rules/design.md`,
   `.impeccable/config.json`, `scripts/design-context.mjs`, `tests/design-context.test.ts`,
   `tests/e2e/design.spec.ts` and `tests/e2e/outbox.ts`. Read the Impeccable section of `.claude/skills/VENDORED.md` first:
   it says what the skill runs and what was switched off.
2. `npm install --save-exact -D impeccable@4.9.1`.
3. From the template's versions, take: the `env`, the two `impeccable` hook entries and the
   `impeccable` permission lines in `.claude/settings.json`; `linkDesignEngine` in
   `.claude/hooks/session-start.mjs`; the Impeccable block in `.gitignore`; the new excludes in
   `biome.json`; the `theme`, `theme:check` and `design:context` scripts in `package.json`;
   `tokenValue` exported from `scripts/build-tokens.mjs`; the line the generator adds to the design
   test (`scripts/new-feature.mjs`); the `design:context` step in `.github/workflows/check.yml`; the two generated design files in
   `.claude/hooks/guard.mjs`; the `design.md` and `ARCHITECTURE.md` lines under `mobile` in
   `scripts/removable.mjs`.
4. Add `character` to `packages/theme/src/brand.ts`: the look in a sentence or two.
5. `npm run theme`, then `npm run design:context`. Commit `DESIGN.md` and `PRODUCT.md`.
6. Add each of your own pages to `tests/e2e/design.spec.ts`, run `npm run e2e`, and fix what the
   detector finds.

## 0.1.0

The first version. Nothing to apply.

<!--
## x.y.z

### Short title (security, if it is)

What changed and why.

How to apply it:
1. ...
2. Run `npm run check`.
-->
