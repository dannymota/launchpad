# Motion

Motion explains a state change. If it explains nothing, remove it.

## Rules

| Rule | Value | Source |
| --- | --- | --- |
| Properties | color, background, border, opacity, transform only | U, H |
| Never | `transition: all`; width, height, top, left, margin, large blur | U, H |
| Easing (tweens) | one curve: `cubic-bezier(0.22, 1, 0.36, 1)` | U |
| Hover, press, toggle | 120 to 180ms | U |
| Menus, popovers, tooltips | 160 to 220ms | U |
| Entrances, sheets, layout | 300 to 500ms | U |
| Stagger | 40 to 60ms, at most 6 items | U |
| Rise on enter | 6 to 12px | U |
| Press scale | 0.97 to 0.98 web (U); 0.96 default, 0.965 wide rows, 0.90 round icon buttons on iOS (S) | U, S |
| Entrances on load | apps 0; pages at most 1 plus one signature move (tunable, defaults C2) | U, H, T |
| Loops | none unless the thing is live | U |
| Hover on cards | color or surface step; no scale | U |
| Reduced motion | fewer and gentler, not none: keep opacity and color fades, drop travel | F, H |
| Tooltips on data | no delay | V-C4 |

## Springs (when the stack uses them)

Web (Motion / Framer), three tiers [F]:

| Tier | Duration | Bounce | Use | Exit (tween, one tier faster) |
| --- | --- | --- | --- | --- |
| fast | 0.08s | 0 | icons, small toggles | 0.06s |
| moderate | 0.16s | 0 | menus, panels, rows | 0.12s |
| slow | 0.24s | 0.12 | large surfaces, landing blocks | 0.16s |

Bigger moving things get slower springs [F].

SwiftUI presets, `response/dampingFraction` [S]:

| Preset | Value |
| --- | --- |
| UI pop | 0.35 / 0.6 |
| Standard settle (sheets) | 0.4 / 0.65 |
| Physics settle (gesture cards) | 0.45 / 0.7 |
| Slow morph | 0.6 / 0.8 |

Never a bare `.spring()`. Loaders use linear motion, never a spring. Haptic on the press-down edge [S].

## Observed timings from demo videos [V-A3, transitions.dev]

Reference values, not a library to copy:

| Change | Value |
| --- | --- |
| Chart morph | 400ms, cubic |
| Sliding tab pill | 250ms, cubic-bezier |
| Value snap | 200ms, soft blur 2px |
| Card expand | 350ms spring |
| Text morph | 150 to 250ms, `cubic-bezier(0.22, 1, 0.36, 1)` [RW] |
| Digit roll | 250 to 300ms, `cubic-bezier(0.34, 1.56, 0.64, 1)`, 8px travel, 20ms stagger, blur 2px [RW] |
| Accordion | 350ms, `cubic-bezier(0.32, 0, 0.67, 0)` [RW] |
| Background expand | scale to 1.05 [RW] |

Name recipes `[element]-[effect]-[property]` (for example `pill-slide-transform`) so a reviewer can find them [RW].

## Tailwind 4

```html
<button class="btn btn-primary transition-colors duration-150 ease-out-quint active:scale-98">
<div class="transition-[transform,opacity] duration-200 motion-reduce:transition-opacity">
```

Define the tokens once:

```css
@theme {
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
}
```

Then use `ease-out-quint`. Keep durations to three values per screen (150, 200, 400) [D, inside the sourced ranges].

## Allowed motion that adds craft

- A changed number tweens or rolls [U, V-A1].
- A list highlight glides between items [F].
- A button morphs into its result ("Save" -> check "Saved") [V-C5].
- A hold-to-confirm fills linearly and snaps back on release [V-C5].
- Queue items move between columns on a real state change [V-C3].
- Pause morphs into resume in place [RW].
- Copy morphs to a check in place instead of a toast [RW].

## Remove on sight

`animate-pulse` / `animate-ping` on static things, `hover:scale-*` on cards, parallax, floating loops, shimmer headings, shimmer skeletons (DaisyUI `skeleton`), breathing glows, fade-up on every section, bouncy springs on plain UI, `hover-3d`.
