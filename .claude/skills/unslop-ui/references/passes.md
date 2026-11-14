# Passes

Run in this order. Finish a pass across the whole screen before the next. Spacing goes first because everything reads differently once the rhythm is right. Copy goes before type and layout because headline length decides size and position. Visuals and motion go last because they must fit a screen that already works [U].

When nearly every line changes, plan all passes, then write the new screen in one go, as long as every pass is applied [U].

Each pass has an entry check (do not start until it holds) and an exit check (measured). A pass is done only when every exit check passes. One pass runs across the whole screen, every block, before the next pass starts [U]. Values: [tokens.md](tokens.md). Per-surface rows: [surfaces.md](surfaces.md). Classes: [astryx.md](astryx.md).

## 0. Structure (heavy grade only)

Entry: the grade is heavy and the layout fails the question test ([prework.md](prework.md) section 4). Ask the user before any structure change (defaults C10).

Do:
- Make the biggest block answer the screen's question. Put the finding under the title.
- Bring every block the brief names onto the first screen (header and first rows at 1440x900).
- Put the most frequent job one click from the first screen.
- Landing: centered stack to an asymmetric split or a full-bleed scene; neighbouring sections differ [T, RW].
- Keep every feature, field and data block. Reorder or resize; do not delete.

Check:
- [ ] The biggest block answers the question
- [ ] Every named block visible at 1440x900
- [ ] Wiring list unchanged ([prework.md](prework.md) section 2)

## 1. Spacing

Entry: before numbers saved (measure.js and the screenshot).

Do:
- Put every margin, padding, gap and fixed height on the 4px grid.
- Give equal things equal sizes: one row height and gap per list, one padding per card row.
- Make inside-group gaps smaller than between-group gaps.
- Align icons in one column, labels on one line, figures right-aligned in one column.
- Apply Form spacing to every form.
- Measure the sidebar after the pass; it breaks most often [U].

Check:
- [ ] `rg -c '\-\[\d+(\.\d+)?px\]'` returns 0 for spacing utilities
- [ ] Every gap measured in DevTools is a multiple of 4 (2px nudges inside controls allowed)
- [ ] Section labels: 24 above, 8 below
- [ ] Forms match 48/40 container, 8/24/8/20/4/24/8 inner gaps

## 2. Color

Entry: spacing exit check passed.

Do:
- Install the custom theme (astryx.md). Pick graphite, warm or ink from the World line.
- Map every surface to `base-100/200/300`, every text to `base-content`, `ink-2`, `ink-3`.
- Keep one accent for the primary action, selection or one key figure.
- Turn status fills into soft tints with dark same-hue text. Darken per hue until 4.5:1 and add a dot or icon so color is not the only signal (defaults C13).
- Keep the product's light or dark theme; never switch theme as a fix (defaults C11).
- One glow is allowed inside a Moment only (defaults C4).
- Remove gradients, glows, blobs, neon borders, colored shadows.

Check:
- [ ] Color count down (report it as "16 colors -> 4 colors") [RW]
- [ ] 0 hue-to-hue gradients, 0 gradient text, 0 colored shadows; at most one glow, inside a Moment
- [ ] Distinct text colors 4 or fewer (3 roles plus accent)
- [ ] Accent on 5% or less of the screen [D; sources say "a few percent", taste measured 3% or less]
- [ ] Every text role 4.5:1 or better on its surface
- [ ] No hex literals or Tailwind palette colors in components; no `dark:` on DaisyUI colors

## 3. Icons

Entry: color exit check passed.

Do:
- Replace every emoji used as an icon or decoration with one line set (the project's, else lucide).
- Set 16 or 18px, stroke 1.5, text-role color, fixed box, 8 to 10 gap.
- Drop icons that add nothing.

Check:
- [ ] Emoji count 0 (measure.js)
- [ ] One icon size per context, one stroke width
- [ ] Icons carry no colors of their own

## 4. Copy

Entry: icons exit check passed.

Do:
- Replace greetings with the page or period name.
- Remove `!`, trailing periods on short strings, hype words, sparkles.
- Give every delta a baseline.
- List unverifiable claims and ask the user. Remove or make specific.
- Turn hype and "AI-" labels into facts with units and times ("AI-Predicted ETA" to "Arriving at 7:42 pm, in 12 minutes, about 1.4 km away") [RW].
- Give every number a unit. Replace fake data with the sample data file ([prework.md](prework.md) section 5).
- Run the stop-slop prose rules on any paragraph.

Check:
- [ ] `rg` for CPY patterns in tells.md returns 0
- [ ] Hero headline 7 words or fewer, sentence 12 or fewer (Marketing)
- [ ] About 80 words per screen or fewer
- [ ] Name-swap test on the headline fails for a competitor

## 5. Type

Entry: copy is final (headline length sets size).

Do:
- Choose one family for the character, plus at most one partner.
- Cut to about 5 sizes from the tokens column.
- Set weights 400 and 500; 600 only for one emphasis role. One weight outlier is allowed for the one hero figure (defaults C6).
- Sentence case everywhere; tracking 0 under 16px.
- `tabular-nums` and one number format.

Check:
- [ ] Distinct font sizes 6 or fewer (App, Mobile), 9 or fewer (Marketing)
- [ ] Distinct weights 3 or fewer; 700 or above only on the one hero figure
- [ ] 0 tracked uppercase labels
- [ ] Every figure tabular, one format

## 6. Layout and density

Entry: type set.

Do:
- Keep sections and their order.
- App: sidebar 224 to 280 (new apps: sidebar only past about 7 destinations, defaults C9), top bar 56 to 64, content capped 1440 to 1600.
- Card rows end level: spans add up to the grid; no dead bands [T].
- Change density as one setting: text, icon and gap together (13 to 12, 16 to 14, 8 to 4) [F].
- Marketing: asymmetric split or full-bleed scene; headline, sentence and CTA visible at 1280x800.
- Mobile: stack in reading order; visual after actions; platform defaults from [surfaces.md](surfaces.md) section 3.
- One primary action, at most one secondary.

Check:
- [ ] Measured shell widths inside token ranges
- [ ] 1280x800 screenshot shows hero headline, sentence and CTA (Marketing)
- [ ] Centered share under 72% (Marketing)
- [ ] Primary buttons per view: 1
- [ ] Bottom edges of each card row level

## 7. Details and states

Entry: layout set.

Do:
- Apply nested radius: inner = outer - padding, never below 4.
- Turn counts into quiet mono text and shortcuts into `kbd`.
- One main chart, one accent per chart, muted grid, chart type fits data.
- Stat cards: label, figure, delta.
- Every control in 8 states: default, hover, focus-visible, active, selected, disabled, loading, error ([states.md](states.md)).
- Place the Signature detail where it belongs and nowhere else.
- Every data block in loading, empty, zero, error, first run and stale ([states.md](states.md)). Loading = flat grey bars at real size, no shimmer.
- Run the stress tests in [states.md](states.md): long name, large text, two-line row, big numbers, 390 wide.

Check:
- [ ] Distinct radii: one per nesting level; 3 or fewer panel radii
- [ ] Tab reaches every control with a visible focus ring
- [ ] 0 sparklines in stat cards, 0 card-in-card
- [ ] Signature appears, once per context
- [ ] Every data block shows all six data states (render each once)
- [ ] Every stress test passes, or the fail is listed with a crop

## 8. Visuals and people

Entry: details and states done.

Do:
- Remove blobs, orbs, robots, brains, glowing grids.
- Landing hero: a scene from the world or a coded product preview with plausible data.
- Dashboards and apps: no generated images except empty states and onboarding.
- Where people exist (contacts, authors, drivers), use real portraits or the user's avatars, not initials circles [RW, V-A5].
- Add 1 to 3 premium moves from [premium-moves.md](premium-moves.md) that render the Moments line.

Check:
- [ ] 0 filler visuals
- [ ] At most one visual per section; hero visual shows something true
- [ ] No text baked into images; image ground matches the page

## 9. Motion

Entry: the static screen works.

Do: follow [motion.md](motion.md). Apps get no entrances; pages get at most one entrance plus one signature move (defaults C2).

Check:
- [ ] `rg 'transition-all|transition:\s*all|animate-pulse|animate-ping|hover:scale'` returns 0 (pulse allowed only on live elements)
- [ ] One easing curve; 3 or fewer durations
- [ ] Apps: 0 entrances. Pages: at most one entrance plus one signature move
- [ ] Reduced-motion fallback present
