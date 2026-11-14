# Proof

The designers' afters convinced people because they showed evidence: measured values, from -> to labels on the screen, counts, and the same prompt run with and without the skill [RW, I, X:tobiadonadon_]. Produce all of it. Tags point to [sources.md](sources.md).

## 1. Re-render and measure

- Re-render at the same widths as the before (1440, 768, 390; 1280x800 for a landing fold) [U, T].
- Run [../scripts/measure.js](../scripts/measure.js) again. Fill the before/after table in [review-checklist.md](review-checklist.md) [T].
- Lead with the color count, the way the videos do: "16 colors -> 4 colors" [RW].

## 2. On-screen from -> to redlines

For the 3 to 6 biggest changes, mark the value on the screen itself [RW, U]:

1. On the before render, run [../scripts/redline.js](../scripts/redline.js) with `fixed: false`. Each wrong value gets a red box and a tag: `SPACING gap 6, 11, 3 -> 4`.
2. On the after render, run it with the same notes and `fixed: true`. The same tags turn green.
3. Tag with the pass name (SPACING, COLOR, ICONS, COPY, TYPE, LAYOUT, STATES, VISUALS, MOTION).
4. Label values the way a designer would: token names or numbers, never adjectives ("#1E004B -> #0E0E0F", "Arial Bold 44 -> Geist 24/500", "Unread red -> soft blue") [RW].

```js
// Playwright
await page.addScriptTag({ path: 'scripts/redline.js' });
await page.evaluate(n => window.unslopRedline(n), [
  { sel: 'aside nav a', label: 'row gap 6, 11, 3 -> 4', pass: 'Spacing', fixed: false },
  { sel: 'h1', label: 'Welcome back -> October 2026', pass: 'Copy', fixed: false },
]);
await page.screenshot({ path: 'proof/before-redlines.png', fullPage: true });
```

## 3. Paired crops

Same region, same size, before and after, for each redline. Under each pair write the cause, the one-line fix and the measured positions in CSS px ("button 6px below the field, the same as the gap above; now 24") [I, X:thorstenball].

## 4. Same-prompt before/after

When you show what the skill does (a demo, a PR description, a post the user will make):

1. Take the original prompt or brief that made the screen.
2. Run it once without this skill in a fresh session, and once with it. Same model, same component base, same data file.
3. Render both at the same widths. Put them side by side, labelled "Same prompt: without unslop-ui / with unslop-ui" [RW, X:tobiadonadon_].
4. Add the measure.js counts for both under the pair.

Skip this step for an ordinary fix of the user's own screen; the before/after of the real screen is the proof there.

## 5. Checks

Run [review-checklist.md](review-checklist.md) (pass/fail lines), the stress tests in [states.md](states.md), then [independent-review.md](independent-review.md). The name-swap test runs last [U].

## 6. Report format

```
Surface: Dashboard        Grade: heavy -> no slop (round 2 of 3)
Direction: <five lines>
Counts: colors 16 -> 4 · sizes 13 -> 5 · weights 4 -> 2 · radii 5 -> 3 · shadows 22 -> 1 · gradients 20 -> 0 · emoji 30 -> 0
Kept: 14/14 links · 5/5 fields · 9/9 handlers · 6/6 test ids
Redlines: proof/before-redlines.png, proof/after-redlines.png
Crops: <3 pairs with cause, fix, px>
States: loading ✓ empty ✓ zero ✓ error ✓ first run ✓ stale ✓
Stress: long name ✓ large text ✓ two-line row ✓ big numbers ✓ 390 ✓
Review: fix -> ship · overall 7.9 (caps: none) · old one did better: nothing
Name-swap: fails for <competitor>
Open: <claims to confirm, missing assets, defaults changed>
```

## 7. Optional story video

If the user wants a before/after video: CSS-only steps that tween between the before and after values, about 10 seconds, square, redlines on screen, and the credit "unslop by @heydamir" [U]. Change values, not structure, so the tween works [U].
