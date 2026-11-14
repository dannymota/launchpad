# Tokens

Every number the passes use. Source tags in brackets point to [sources.md](sources.md). `[D]` marks a default this skill chose where no source gives a number. Where sources conflict, the default and how to tune it per surface is in [defaults.md](defaults.md) (C1 to C15). Keep a project's own good system; fix how it is used instead.

Pick one column per screen from the surface ([surfaces.md](surfaces.md)):

| Surface | Column | Also apply |
| --- | --- | --- |
| Web app | App | |
| Dashboard | App | Charts |
| Settings | App | Form spacing |
| Form | App (Mobile on phones) | Form spacing |
| Landing | Marketing | Copy limits |
| Mobile | Mobile | Platform defaults (surfaces.md section 3) |
| Agent tool | App | Mono for ids, durations, costs |

## Spacing

Grid: 4px. Scale: 4 8 12 16 20 24 32 40 48 64 80 96 128 [U]. Any multiple of 4 is allowed. A 2px nudge inside a small control is allowed [U]. Mobile may use an 8pt rhythm for gutters [V-A1].

| Use | App | Marketing | Mobile |
| --- | --- | --- | --- |
| Inside a control | 4 to 12 [U] | 4 to 12 [U] | 4 to 12 [U] |
| Between related items (list rows) | 2 to 8 [U] | 2 to 8 [U] | 12 to 16 [V-B1, D] |
| Between groups | 12 to 24 [U] | 12 to 24 [U] | 24 [V-A1, V-A6] |
| Between sections | 32 to 64 [U] | 80 to 128 [U] | 32 to 48 [D] |
| Page edge / gutter | 24 to 32 [U] | 24 to 32, container capped, only gutters grow at 1920 [U, H] | 16 to 24 (24 seen in two videos) [V-A1, V-A5, V-B1] |
| Card padding | 20 to 24 [U] | 24 to 32 [D] | 20 [V-A6] |
| Panel / sidebar padding | 16 [U] | n/a | 16 [D] |
| Nav to hero headline | n/a | 96 to 128 [U] | 48 to 64 [U] |

Section label: 24 above, 8 below [U]. Nav rows: 32 to 36 tall, 2 to 4 apart [U].

### Form spacing (all columns) [V-C8]

Build outside in.

| Gap | Value |
| --- | --- |
| Container padding, top and bottom | 48 |
| Container padding, sides | 40 |
| Form header to caption | 8 |
| Between field groups | 24 |
| Label to input | 8 |
| Between fields in a group | 20 |
| Input to helper text | 4 |
| Helper text (last field) to submit | 24 |
| Between secondary buttons | 8 |

On Mobile, keep the inner gaps and drop the container sides to the page gutter (16 to 24) [D].

## Layout

| Use | App | Marketing | Mobile |
| --- | --- | --- | --- |
| Sidebar width | 224 to 280 (heydamir 240 to 280; taste median 230) [U, T]. New apps: sidebar only past about 7 destinations, else a top bar [H, C9] | n/a | n/a (tab bar) |
| Sidebar resize range, if resizable | 160 to 360 [F] | n/a | n/a |
| Top bar | 56 to 64 [U] | quiet nav: logo, links, one button [U] | n/a |
| Content max width | fluid, capped 1440 to 1600 [U] | one container width, capped [H] | full width |
| Hero rule | n/a | headline, one sentence and CTA visible at 1280x800 [H] | visual after the actions [U] |
| Centered share | n/a | under 72% of the page [T] | n/a |
| Main chart | at least 2/3 of content width, 280 to 360 tall [U] | n/a | full width [D] |
| Stat cards | 3 to 4 per row, one height [U, T] | n/a | 2 per row [D] |
| Actions in a view | 1 primary, at most 1 secondary [U] | same [U] | 1 primary [D] |

Never shrink an App into a narrow centered column [U]. No text in a mobile preview below 11px [U].

## Type

### Families

One family plus at most one partner [U]. Pick by the character line in the direction [U]:

| Character | Interface | Partner |
| --- | --- | --- |
| Precise, technical, calm | Geist, Inter, IBM Plex Sans | Geist Mono, IBM Plex Mono, JetBrains Mono for figures |
| Warm, human | Instrument Sans, DM Sans, Figtree | Instrument Serif or Newsreader, hero headline only |
| Editorial | Inter or Instrument Sans | Newsreader, Instrument Serif or Fraunces for headlines |
| Playful, bold | Space Grotesk, Bricolage Grotesque | a mono for small labels |

Mobile native: SF Pro (iOS system); New York Medium is an allowed display partner [V-A7]. Observed swap in two videos: Arial Bold to Geist [V-B2, V-B3].

### Sizes (px, size/line-height, weight)

| Role | App | Marketing | Mobile |
| --- | --- | --- | --- |
| Meta, counts | 12/16, 400 [U] | 12/16 [U] | 12/16 [D from U] |
| Secondary, captions | 13 to 14/20, 400 [U] | 14/20 [U] | 14 [V-A5] |
| Body, nav | 13 to 15/20 to 22, 400 to 500 [U, F] | 16 or more [H]; 16 to 18 [T] | 14 to 16 [V-A5]; inputs 16 [F] |
| Card / row title | 16/22, 500 [F] | 18 to 20/28 to 30 subhead, max 36rem wide [U] | 16 to 18 [V-A5, V-A6] |
| Page title | 24 to 32, 400 to 500 (taste median 24; heydamir 28 to 36) [T, U] | n/a | 27 to 34, 500 (Geist 34/500 [V-B3]; SF Pro 27 [V-A5]; Jakarta 28 [V-A6]) |
| Section heading | 16 to 20 [F, T] | 32 to 40 [D] | 24/500 [V-B3] |
| KPI / card figure | 26 to 32, 500, tabular (taste median 26) [T, U] | n/a | 34 to 68 [V-B3] |
| Hero headline | n/a | 56 to 72, line-height 1.02 to 1.08, 400 to 500 [U]; about 5vw [T] | 36 to 44 [U]; 40 [T] |

App figures never reach 48 [T]. Distinct sizes per screen: about 5, far apart; flag over 6 on App, over 9 anywhere [T, D for the 6]. Body-to-headline jump on Marketing: 3x or more [T].

Weights: 400 and 500; 600 only for rare emphasis; never 700 to 900 [U]. One exception per screen: the one hero figure may take a weight outlier, light (Geist 68/200 [V-B3], 48/300 [RW]) or bold (wallet balance 64/700 [RW]) [C6]. Mobile video tokens used 700/600/400 [V-B8]; this skill keeps 400/500 as the default and allows 600 for one emphasis role.

Tracking: 0 under 16px; +0.01em allowed on small muted text; from 40px -0.02em; from 56px -0.03em [U]. Case: sentence case; no tracked uppercase; no eyebrows [U, H, F]. Numbers: `tabular-nums`, one format [U].

## Color

### Ramps (graphite is the App default) [U]

Dark:

| Role | Graphite | Warm | Ink |
| --- | --- | --- | --- |
| Deepest (sidebar) | #0f0f10 | #12110f | #07080d |
| Page | #141415 | #161513 | #0b0d14 |
| Card | #19191b | #1c1a18 | #11141c |
| Raised (active row, input) | #232325 | #262421 | #1a1e28 |
| Primary text | #ededed | #efe9de | #eef0f5 |
| Secondary text | #a1a1a6 | #aaa398 | #a3a9b8 |
| Muted text, icons | #85858b | #8a847a | #7a8296 |

Light:

| Role | Graphite | Warm | Ink |
| --- | --- | --- | --- |
| Page | #fafafa | #f7f4ee | #f5f7fa |
| Card | #ffffff | #fdfbf7 | #ffffff |
| Raised | #f4f4f5 | #efe9df | #eceff4 |
| Primary text | #171717 | #1f1b16 | #111827 |
| Secondary text | #525252 | #5e554a | #4b5565 |
| Muted text, icons | #737373 | #7b7266 | #6b7487 |

Mobile dark ground: #09090B instead of #000000 [V-B4]. Observed card on that ground: #131316 [V-A1].

### Rules

| Rule | Value |
| --- | --- |
| Text roles | 3: primary, secondary, muted [U]. On dark, keep secondary and muted far apart (about #b4b4b4 and #949494 if you tune) [T] |
| Contrast | 4.5:1 or more for every text role, placeholders included [U, T] |
| Accent share | a few percent of the screen; taste measured 3% or less [U, T] |
| Accents | 1 in the chrome [U]. Rich color only inside the 1 or 2 moments [U] |
| Hairline | primary text color at 6 to 10% (8% default) [U] |
| Depth, dark | surface steps plus hairline; button top highlight `inset 0 1px 0 rgba(255,255,255,0.12)` [U] |
| Depth, light | `0 1px 2px rgba(0,0,0,0.05)` small; `0 8px 24px rgba(0,0,0,0.06)` floating [U]. A border or a shadow, not both [T] |
| Hover / selected overlay | dark +6% / +10% white; light 4% / 7% black [F] |
| Neutral gradient | allowed only as a small tone shift inside one neutral, e.g. #2b2b2b to #1f1f1f [U] |
| Semantic, dark | positive #4cc38a, negative #e5484d [U] |
| Semantic, light | positive #16a34a fill; #247b50 for green text (5.2:1) [U, T]; negative #dc2626 [U] |
| Status pills, light | positive #dcfae5 / #04250e; negative #ffedea / #831c1e; notice #fffbeb with #92400e text [T]. Badge 20 high, radius 6 [R]. Darken text per hue until 4.5:1; add a dot or icon so color is not the only signal [I, C13] |
| Status pills, dark | hue on a dark tint of itself: #3fc07a on #172a1d [T] |
| Glass (iOS 26 system chrome only: tab bar, search, toolbar) | fill 7% (rest) and 10% (raised) [V-B4, C3]. Never on web cards |
| Opacity ladder (Mobile) | ghost .06 to .08, subtle .12, inactive .3, secondary .5, active .8 to .9 [S] |

Accent from the world [U]: warm worlds amber, coral, ember orange; cool worlds cobalt, teal, sky blue; natural worlds moss, sage. Avoid purple to blue unless the brand is purple.

## Controls

| Use | App | Marketing | Mobile |
| --- | --- | --- | --- |
| Control height | 32 to 36 (taste median 34); compact 28 [U, T, F] | hero buttons 44 to 48; nav buttons 32 to 36 [U] | touch targets 44pt iOS [T, S], 48dp Android [D]; chips 36 [V-A5] |
| Button side padding | 12 [F] | 16 to 20 [U] | 16 to 20 [U] |
| Row height | 32 compact, 36 default [U]; data rows 40 [R] | n/a | 40 to 44 [U]; two-line rows with media 56 to 92, median 72 [T]; message rows 80 [V-A5] |
| Density step | text 13 to 12, icon 16 to 14, gap 8 to 4 [F] | n/a | n/a |
| Primary button | light: primary-text fill with white text; dark: off-white with dark text [U] | same | near-black pill (light) or off-white pill (dark) [V-A6, V-A8, V-B1] |

Button and menu rows share one height so a menu row lines up with its trigger [F].

## Radius

| Element | App / Marketing | Mobile |
| --- | --- | --- |
| Keycap, tag, small button, badge | 4 to 6 [U, R] | 6 to 8 [D] |
| Row, input, button | 8 [U, T] | 12 [D] |
| Card | tight 4 to 8 or soft 16 to 24, picked once per product; theme default soft 16 [T, U, C7] | 22 to 28 [V-A5, V-A6] |
| Panel, window, modal | one step above cards: tight 8, soft 20 [U, T, C7] | 28 [V-A6] |
| Pill | only chips, avatars, toggles, mobile primary buttons [U, V] | same |

Nested radius: inner = outer - padding, never below 4 [U]. Fluid states it as max(0, outer - inset - border) [F]. Distinct panel radii per screen: 3 or fewer [T]. Taste measured radius as bimodal (4 to 8 or 16 to 24); 11 to 12 everywhere is the weak default [T]. Pills: write radius as half the height [U].

## Icons

One set (lucide if the project has none) at 16 or 18, stroke 1.5, in the text-role color, fixed icon box, 8 to 10 gap to the label [U]. Compact density: 14 [F]. Mobile native: SF Symbols [V-A1].

## Charts

One main chart; others smaller and of another kind (ranked list, short table) [U]. One accent per chart; rest in neutral steps [U]. Muted grid, mono axis labels with units ($300K) [U, I]. Trend = line, comparison = bars, share = one stacked bar, goal = progress bar [U]. Give the chart a takeaway line [V-C1].

## Copy limits

| Limit | Value |
| --- | --- |
| Hero headline | 7 words or fewer, 50 characters [H]; 2 lines at most [T] |
| Hero sentence | 12 words or fewer [H] |
| Words per screen | about 80 [H] |
| Marketing page | 6 to 9 sections, 450 visible words at most [H] |
| Prose score (stop-slop, 5 dimensions x 10) | revise under 35/50 [P] |

## Motion

See [motion.md](motion.md).

---

Spacing, color ramps, type scale, radius and motion tables adapted from unslop by Damir Sokolovsky (@heydamir), CC BY 4.0 (https://github.com/heydamir/unslop). Changes: split into App, Marketing and Mobile columns, merged with values from taste-skill, Hallmark, Fluid Functionalism, swiftui-microinteractions and video notes, defaults marked `[D]`.
