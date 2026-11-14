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
| Config | `npm run config:check` | Worker and listing names match the config |
| Code | `npm run check` | Lint, types, repo rules, runtime tests |
| Build | `npm run build`, then `npm run doctor -w @app/web` | The bundle and the pages |
| Brand | `npm run theme:check` | Generated theme files are current; contrast tests ran in `check` |
| Listings | `npm run check:listing` | Store fields, when there is an app |
| Edge | `npm run access:check -- staging` | Cloudflare Access matches the access map |
| Live | `npm run smoke -- staging` | Each area answers a stranger the way the map says |

The last two need the Cloudflare token (see `/ship`). Without it, mark them "not run" with the reason.

## The report

Write `product/launch-report.md`:

1. **Ready**: each gate that passed, one line each.
2. **Not ready**: each gate that failed, with the first line of its output and what would fix it.
3. **Waiting on the owner**: only things a person must supply or decide. Check each against the
   product and list those that apply: a domain; a sending domain for email; Google and Apple
   sign-in keys; Stripe keys and prices; the Anthropic key; artwork for the icon; Apple Developer
   and Google Play listings and builds; a legal read of the privacy and terms pages; who may sign in.
4. **Not verified here**: what could not be tested from this environment (a real device, real
   payments, real email), so nobody reads silence as a pass.

End your message with the count: gates passed, gates failed, items waiting on the owner.
