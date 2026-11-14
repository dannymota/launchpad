---
name: unslop-ui
description: Audit and fix a UI screen that looks AI-generated, on web apps, dashboards, mobile (iOS and Android), landing pages, forms, settings and agent tool screens. Use when asked to unslop, deslop, polish or review a screen, or when it shows tells like purple gradients, glows, emoji icons, greeting headlines, tracked uppercase labels, pill-everything, uneven spacing, missing states or numbers that do not add up. Measures first, keeps content and wiring, fixes in ordered passes, proves the result with counts, redlines and an independent review. Maps fixes to Astryx components and this repository's brand theme. Based on unslop by Damir Sokolovsky (@heydamir), CC BY 4.0.
license: CC-BY-4.0
metadata:
  adapted-from: https://github.com/heydamir/unslop
  credit: unslop by Damir Sokolovsky (@heydamir)
---

# unslop-ui

Turn a screen that reads as generated into one only this product could own. Adapted from unslop by Damir Sokolovsky (@heydamir), CC BY 4.0; see [references/sources.md](references/sources.md).

## Rules that hold on every run

- **Keep the product.** Features, content, data, section order, links, fields, handlers and test ids stay. Change the craft: every size, color, word and image becomes a decision.
- **Neutral frame, 1 or 2 rich moments.** Chrome stays quiet; color and detail go to the content moments the direction names.
- **Measure first.** Judge rendered pixels and measured numbers, not code or taste.
- **No change is a valid result.** If the audit finds no tells, say so.
- **Fill what you remove** with scale, full content and real data, never a new ornament (glass on cards, grain, neon, bento).
- **One pass at a time**, across the whole screen, in order.
- Every value from [references/tokens.md](references/tokens.md); no arbitrary values like `mt-[13px]`. Source conflicts use the tunable defaults in [references/defaults.md](references/defaults.md).
- Stack: Astryx, with the brand in `packages/theme/src/brand.ts` ([references/astryx.md](references/astryx.md)). The other reference files name DaisyUI classes; astryx.md says what to use instead and wins where they differ. shadcn-based sources are value references only.
- Never rename the product, never invent metrics, logos or testimonials. Work only on the screens named. At most 3 rounds.

## Workflow (25 steps)

### Look (pre-work: [references/prework.md](references/prework.md))

1. **Render and screenshot** at 1440 and 390 (plus 768; 1280x800 for a landing fold).
2. **Record the wiring** that must survive: links, routes, fields, handlers, test ids, blocks.
3. **Measure**: run [scripts/measure.js](scripts/measure.js), save the before numbers.
4. **Classify the surface** with [references/surfaces.md](references/surfaces.md): web app, dashboard, mobile, landing, form, settings or agent tool. This picks the token column and the defaults column.
5. **Audit** with [references/tells.md](references/tells.md), then the surface's table. One line per tell: `id | where | evidence`.
6. **Grade**, and do not blend depths:

| Grade | Criteria [D] | What you do |
| --- | --- | --- |
| Heavy | 8 or more tells, or tells in 3 or more groups | Full run, steps 7 to 25, Structure pass included |
| Light | 1 to 7 tells in at most 2 groups | Fix only the listed tells; keep brand, palette, type, layout. Bigger ideas go in the report |
| No slop | 0 tells, or template-look only | Say so. At most 3 refinements with exact values, applied only if the user agrees |

7. **Inventory** (app screens): objects and fields with units and magnitudes, who opens it and how often, the jobs, the product's own things. Write sample data as a file; compute totals from rows and assert they agree.
8. **Name the question and the finding**: the one question the screen answers (the biggest block answers it) and today's finding, placed under the title beside its action. The most frequent job is one click away.
9. **Write the direction**, exactly five lines, then stop for approval unless the user said go:

```
Product: <what it does, for whom>
Character: <2 or 3 concrete words; none from tells.md CPY-08>
World: <place or material> -> ramp <graphite | warm | ink>, accent <hue from the world>
Moments: <1 or 2 rich places; per surface in surfaces.md>
Signature: <one detail only this product has>
```

10. **Feed 3 to 5 reference apps** that fit the use case. Copy their structure, not their look.

### Fix (passes: [references/passes.md](references/passes.md))

Each pass has an entry check and a measured exit check. Finish it across the whole screen before the next.

11. **Structure** (heavy only; ask first): biggest block answers the question.
12. **Spacing**: 4px grid (8pt on mobile), equal things equal, inside-group gap under between-group gap.
13. **Color**: one ramp, 3 text roles, 1 accent at about 3%, tinted status pills, one glow at most inside a moment.
14. **Icons**: one set, one size, stroke 1.5, 0 emoji.
15. **Copy**: no `!`, no greeting, units on every number, baselines on every delta, facts instead of hype.
16. **Type**: one family plus one partner, about 5 sizes, 400/500, tabular numbers.
17. **Layout and density**: real proportions, rows end level, density as one setting.
18. **Details and states**: nested radii, 8 control states, 6 data states, stress tests ([references/states.md](references/states.md)).
19. **Visuals and people**: filler out; product or world visual in; real portraits. Add 1 to 3 moves from [references/premium-moves.md](references/premium-moves.md).
20. **Motion**: named properties, one easing, token durations, reduced-motion fallback ([references/motion.md](references/motion.md)).

### Prove ([references/proof.md](references/proof.md))

21. **Re-render and measure** at the same widths. Before/after counts, led by the color count ("16 -> 4"). From -> to redlines on screen with [scripts/redline.js](scripts/redline.js), and paired crops with px values.
22. **Self-check** with [references/review-checklist.md](references/review-checklist.md) and the stress tests. Re-grade. If not "no slop", fix each open tell in its pass and go back to 21.
23. **Independent check** in a fresh context ([references/independent-review.md](references/independent-review.md)): capped scores, "what did the old one do better?", top three problems with evidence.
24. **Preservation and evidence**: every link, field, handler and test id kept; type check, build and tests pass; every finding cites a measurement or `file:line`.
25. **Name-swap test last**, then the report. When showing the skill itself, add the same-prompt before/after. Stop after 3 rounds; if the review is under 7.5, say so plainly.

Report: surface, grade, direction, counts, redlines, crops, states, stress tests, kept wiring, review score, name-swap result, changed defaults, open questions. Credit "unslop by Damir Sokolovsky (@heydamir)" on any shared before/after.

## Reference files

- [references/prework.md](references/prework.md): wiring list, inventory, question, finding, sample data, reference apps
- [references/surfaces.md](references/surfaces.md): seven surfaces, platform defaults, slop-to-fix tables
- [references/tells.md](references/tells.md): every tell with detection and fix
- [references/passes.md](references/passes.md): passes 0 to 9 with entry and exit checks
- [references/states.md](references/states.md): data states, control states, stress tests
- [references/tokens.md](references/tokens.md): all numbers by App, Marketing, Mobile
- [references/defaults.md](references/defaults.md): conflict defaults C1 to C15, tunable per surface
- [references/astryx.md](references/astryx.md): where each value lives in this repository, and the fix-to-component map
- [references/motion.md](references/motion.md): easing, durations, springs
- [references/premium-moves.md](references/premium-moves.md): upgrades from the designers' afters
- [references/proof.md](references/proof.md): redlines, counts, same-prompt, report format
- [references/review-checklist.md](references/review-checklist.md): pass/fail lines and targets
- [references/independent-review.md](references/independent-review.md): fresh-context review, caps, evidence rule
- [references/sources.md](references/sources.md): credits, licences, where each number came from
- [scripts/measure.js](scripts/measure.js), [scripts/redline.js](scripts/redline.js): counts and on-screen redlines
