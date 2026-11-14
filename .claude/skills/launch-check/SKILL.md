---
name: launch-check
description: Check whether the product is ready to launch and say exactly what is left. Use when the owner asks "are we ready", "what is left before launch", or runs /launch-check. Runs every gate, writes product/launch-report.md, and separates what is done from what only the owner can supply.
---

# /launch-check: what is ready, what is not, who owes what

Run every gate. Report results as they are: a failing gate is a finding, not something to fix
quietly in this step.

## Gates

| Gate | Command | Covers |
| --- | --- | --- |
| Brief | `npm run check:brief` | The brief and the product config |
| Config | `npm run config:check` | The files that repeat the config's names match it |
| Code | `npm run check` | Lint, types, repo rules, runtime tests |
| Build | `npm run build`, then `npm run doctor -w @app/web` | The bundle and the pages |
| Brand | `npm run design:context -- --check`, then `npm run theme:check` | Generated theme and design files are current; contrast tests ran in `check` |
| Browser | `npm run e2e` | A stranger, a sign-in, a sign-out, and the design detector on the pages listed in `tests/e2e/design.spec.ts` |
| Packages | `npm audit --omit=dev --audit-level=high` | No known serious hole in what the product ships with |
| Listings | `npm run check:listing` | Every store field is filled in and inside its limit |
| Edge | `npm run access:check -- staging` | Cloudflare Access matches the access map |
| Live | `npm run smoke -- staging` | Each area answers a stranger the way the map says |

The last two need the Cloudflare token (see `/ship`). Without it, mark them "not run" with the reason.

## Beyond the gates

The gates say the code is sound, not that the product is what was promised. Before writing the
report, read `product/brief.md` and the public pages beside the built product, and list under
"Not ready" every promise that is not kept: a feature the site states as fact and nothing does, a
plan limit nothing enforces, a page that tells a customer to do something with no page saying how.

## The report

Write `product/launch-report.md`:

1. **Ready**: each gate that passed, one line each.
2. **Not ready**: each gate that failed, with the first line of its output and what would fix it.
3. **Waiting on the owner**: only things a person must supply or decide. Check each against the
   product and list those that apply:
   - A domain, and a sending domain for email.
   - Google and Apple sign-in keys.
   - Who may sign in.
   - Artwork for the icon.
   - Stripe keys and prices.
   - The Anthropic key.
   - The PostHog key.
   - Apple Developer and Google Play accounts, listings and builds.
   - A legal read of the privacy and terms pages.
4. **Not verified here**: what could not be tested from this environment (anything that needs a
   real account, a real inbox or a real device), so nobody reads silence as a pass.

End your message with the count: gates passed, gates failed, items waiting on the owner.
