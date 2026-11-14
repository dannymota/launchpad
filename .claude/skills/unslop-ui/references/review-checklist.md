# Review checklist

Run after the passes, before the independent check. Every line is pass or fail. A fail needs a fix or a written reason in the report. Proof format: [proof.md](proof.md).

## Proof numbers

Run `scripts/measure.js` before and after at the same viewport. Report this table.

| Metric | Before | After | Target (App / Marketing / Mobile) |
| --- | --- | --- | --- |
| Tells found (tells.md) | | | 0 |
| Distinct colors (text + background + border) | | | lead with this: "16 -> 4" [RW]; 8 or fewer [D] |
| Distinct font sizes | | | 6 or fewer / 9 or fewer / 6 or fewer [T, D] |
| Distinct font weights | | | 3 or fewer [T] |
| Distinct text colors | | | 4 or fewer [U: 3 roles + accent] |
| Distinct background colors | | | 5 or fewer [D: 3 surfaces + accent + one semantic] |
| Distinct border radii | | | 4 or fewer [D: one per level] |
| Box-shadows | | | dark 0 to 1; light only on floating layers [U] |
| Gradients | | | 0 hue-to-hue [U] |
| Emoji | | | 0 [U] |
| Arbitrary Tailwind values | | | 0 [U] |
| Uppercase tracked labels | | | 0 [U] |
| Primary buttons in view | | | 1 [U] |
| Kept wiring (links, fields, handlers, test ids) | | | all kept [H] |

## Grade loop

1. Re-audit with tells.md after the render.
2. Grade again (SKILL.md step 6).
3. If the grade is not "no slop", fix each open tell in the pass that owns it, then re-render.
4. Then the independent check ([independent-review.md](independent-review.md)). Its top three problems join the open list.
5. Stop at 3 rounds. If tells remain or the review scores under 7.5, list them in the report and say so plainly [T, U].

## Pass/fail lines

- [ ] Before numbers, screenshots and wiring list saved before the first edit
- [ ] Surface classified and token column named
- [ ] App screens: data inventory, the one question, the finding under the title, sample data file with asserted totals
- [ ] 3 to 5 reference apps named, with what structure was taken (or the user declined)
- [ ] Direction has exactly five lines, none using banned words
- [ ] Every spacing value on the 4px grid; equal things equal
- [ ] Icons, labels and figures each in one aligned column
- [ ] Custom DaisyUI theme active through `data-theme`; no built-in theme shipped
- [ ] One neutral ramp, 3 text roles, 1 accent, every text role 4.5:1 or better
- [ ] No hue gradients, gradient text, glows, colored shadows, blobs
- [ ] Status pills soft tint with dark text
- [ ] No emoji; one icon set, one size, stroke 1.5
- [ ] No `!`, greetings, trailing periods on labels, hype words, unverified claims, fake data
- [ ] Every delta names a baseline
- [ ] One family plus at most one partner; weights 400 to 600; sentence case; tabular figures
- [ ] Shell proportions inside token ranges (App), hero passes 1280x800 (Marketing), inputs 16px on touch (Mobile)
- [ ] Nested radii add up; not everything a pill
- [ ] Every control has hover, focus-visible, active, disabled, loading, error
- [ ] Every data block: loading (flat bars at real size, no shimmer), empty, zero, error, first run, stale
- [ ] Stress tests pass: long name, large text, two-line row, big numbers, 390 wide
- [ ] One main chart with one accent (Dashboard)
- [ ] Form spacing 48/40 and 8/24/8/20/4/24/8 (Forms)
- [ ] One save model per view; label column beside panel (Settings)
- [ ] 44pt / 48dp targets, tables as 2-line rows, platform sheets (Mobile)
- [ ] Trace legend, header metrics, state by fill, plain-word failures, "Nothing waiting" (Agent tool)
- [ ] 1 to 3 premium moves applied, tied to the Moments line
- [ ] Motion: named properties, one easing, 3 or fewer durations, one entrance, reduced-motion fallback
- [ ] Before/after table, from -> to redlines and paired crops in the report
- [ ] Wiring kept; type check, build and tests pass
- [ ] Independent check done in fresh context; "what did the old one do better" answered; every finding has evidence
- [ ] Same-prompt before/after when the skill itself is being shown
- [ ] Changed defaults (defaults.md) listed in the report
- [ ] Name-swap test last: screen no longer fits a competitor
- [ ] Credit line present on any shared video or post: "unslop by Damir Sokolovsky (@heydamir)"
