# Tells

Each tell has an id, what it looks like, how to detect it, and the fix. Log every hit as `id | where | evidence`. Ids feed the grade in SKILL.md. Exceptions set by [defaults.md](defaults.md) are noted on the tell. An audit with no tells is a valid result: say so and stop.

Detection columns use two kinds of evidence:
- **Code**: a grep pattern or computed-style check. Run `rg -n '<pattern>' src/`.
- **Shot**: what you see in the screenshot.

Fix values live in [tokens.md](tokens.md). DaisyUI classes for each fix are in [astryx.md](astryx.md).

## Color (COL)

| Id | Looks like | Detect | Fix |
| --- | --- | --- | --- |
| COL-01 | Purple to blue or violet to pink gradient on backgrounds, cards, buttons, active nav | Code: `bg-gradient-to\|bg-linear-\|linear-gradient\|from-purple\|from-violet\|from-indigo` | One neutral surface. Accent only where it means something |
| COL-02 | Gradient text in headings, numbers, logo | Code: `bg-clip-text\|text-transparent\|background-clip:\s*text` | Solid `text-base-content` |
| COL-03 | Colored glow around cards, pills, buttons | Code: `shadow-\[0_0_\|drop-shadow\|box-shadow:.*rgba\((1[0-9]{2}\|2[0-9]{2}),` with a hue; Shot: halo | Remove. Depth from surface steps and a hairline. One glow is allowed inside a Moment (defaults C4) |
| COL-04 | Blurred blobs or radial washes behind content | Code: `blur-3xl\|blur-\[\|radial-gradient`; Shot: soft colored clouds | Remove |
| COL-05 | Neon or saturated borders | Code: `border-(purple\|violet\|pink\|cyan\|fuchsia)-` | Hairline: text color at 6 to 10% (`border-base-content/8`) |
| COL-06 | Five near-identical tints for text | measure.js: more than 4 distinct text colors | Three text roles from one ramp |
| COL-07 | Everything highlighted, nothing leads | Shot: accent on more than about 5% of the screen; Code: `btn-primary` used more than once per view | One accent on the primary action, the selection or one key figure |
| COL-08 | Glass card with white inner highlight and colored shadow | Code: `backdrop-blur` on cards; `bg-white/10` plus colored shadow | Plain raised surface plus hairline. Glass only on iOS 26 system chrome (defaults C3; tokens.md, Mobile) |
| COL-09 | Red or green on every number | Shot: 3 or more colored figures with no state meaning | Neutral figures. Semantic color only on the delta that carries meaning |
| COL-10 | Saturated status badge with white text | Code: `badge-(success\|error\|warning\|info)` without `badge-soft`; `bg-green-500 text-white` | Pale tint of the hue with dark same-hue text (`badge badge-soft badge-success`) |
| COL-11 | Pure #000 dark ground | Code: `#000\b\|#000000\|bg-black` on page roots | Ramp ground (#141415 app; #09090B mobile dark) |
| COL-12 | Default framework theme shipped as is | Code: `data-theme="(light\|dark\|cupcake\|...)"`, `themes: light --default` | Custom theme from astryx.md |
| COL-13 | Fixed Tailwind palette colors for text and surfaces | Code: `text-gray-\|bg-slate-\|text-zinc-\|bg-white\b` in themed views | DaisyUI semantic names (`text-base-content`, `bg-base-100`) |
| COL-14 | The "fix look": cream ground plus terracotta accent on a product with no warm world | Shot | Ramp and accent from the direction's world |

## Type (TYP)

| Id | Looks like | Detect | Fix |
| --- | --- | --- | --- |
| TYP-01 | Headings at 700 to 900 | Code: `font-(bold\|extrabold\|black)`, `font-weight:\s*(7\|8\|9)00` | 400 to 500. Hierarchy by size and color |
| TYP-02 | Tracked uppercase labels (`NAVIGATION`, `PAID THIS MONTH`) and eyebrows | Code: `uppercase.*tracking-\|tracking-wide\|tracking-widest\|letter-spacing:\s*0\.[1-9]em` | Sentence case, tracking 0 |
| TYP-03 | Too many sizes and weights | measure.js: more than 6 sizes (app) or 9 (any), more than 3 weights | About 5 sizes far apart, weights 400 and 500 |
| TYP-04 | Mixed number formats (`$48,210` next to `$124,860.40`, `07`) | Shot; Code: missing `tabular-nums` on figures | One format, `tabular-nums` |
| TYP-05 | Negative tracking under 16px | Code: `tracking-tight\|tracking-tighter` on `text-xs\|text-sm\|text-base` | 0, or +0.01em on small muted text |
| TYP-06 | Italic word for emphasis, or one italic or colored word inside a roman headline | Code: `<em>\|italic` inside h1/h2 | Remove. Emphasis by color or size |
| TYP-07 | Arial, system bold, or unchosen default face | Code: `font-family` falls back to Arial or system-ui only | A family picked for the character (tokens.md, Type families) |
| TYP-08 | Display serif used as a shortcut to premium | Shot: serif on labels or buttons | Serif only for large headlines, and only if the world calls for it |

## Icons (ICO)

| Id | Looks like | Detect | Fix |
| --- | --- | --- | --- |
| ICO-01 | Emoji as icons, label decoration, status or avatar | Code: `rg -nP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]'`; measure.js emoji count | One line icon set, or nothing |
| ICO-02 | Emoji in counts (`18 👤`) | Same as ICO-01 | Plain number |
| ICO-03 | Icons in many sizes, colors or strokes | Code: mixed `size-4 size-5 size-6`, `stroke-width` values | One size (16 or 18), stroke 1.5, text-role color |
| ICO-04 | Icons off the column | Shot: labels start at different x | Fixed icon box width, 8 to 10 gap to label |
| ICO-05 | Sparkle for anything AI | Code: `Sparkles\|✨` | Remove, or a plain icon only where it explains something |
| ICO-06 | Grey placeholder squares where icons should be | Shot | Icons from the set |

## Spacing (SPC)

| Id | Looks like | Detect | Fix |
| --- | --- | --- | --- |
| SPC-01 | Arbitrary values | Code: `-\[\d+(\.\d+)?px\]` (e.g. `mt-[13px]`, `h-[31px]`); measure.js arbitrary count | Steps on the 4px scale |
| SPC-02 | Rows in one list with different heights or gaps | Shot plus DevTools: row heights differ | One height, one gap |
| SPC-03 | Groups closer to neighbours than to their own items | Shot: section label equidistant or nearer the group above | Label 24 above, 8 below |
| SPC-04 | Uneven padding in sibling cards | Code: different `p-*` on siblings | One padding |
| SPC-05 | Random vertical rhythm (observed: 14/27/16/12/24/11, 15/32/60/3.5) | DevTools: gaps not on the scale | Snap to the scale; inside-group smaller than between-group |
| SPC-06 | Forms spaced by guess | DevTools on a form | Form spacing in tokens.md |

## Copy (CPY)

| Id | Looks like | Detect | Fix |
| --- | --- | --- | --- |
| CPY-01 | Greeting headline (`Welcome back, Sarah! 👋`, `Morning, Jordan!`, `Hey Alex!`) | Code: `Welcome back\|Good (morning\|evening)\|Hey [A-Z]` | Page or period name (`Wallet`, `October 2026`, `Morning run`) or a state summary (`19 open, 4 won`). One greeting allowed in an assistant panel (defaults C5) |
| CPY-02 | Exclamation marks | Code: `![\"'<]` in UI strings | Plain statement |
| CPY-03 | Delta without a baseline (`+12%!!`) | Shot | `+12% vs last month` |
| CPY-04 | Wordy placeholder (`Search anything...`) | Code: `placeholder=".*\.\.\."` | `Search` |
| CPY-05 | Hype words: supercharge, seamless, unlock, magic, revolutionize, game-changing, AI-powered | Code: `rg -ni 'supercharge\|seamless\|unlock\|magic\|revolution\|game-chang\|ai-powered'` | Say what the thing does |
| CPY-06 | Trailing periods on labels, buttons, captions | Shot | None. Only multi-sentence paragraphs keep periods |
| CPY-07 | Fake data (`$123,456`, `[X]`, `Lorem`) | Code: `123,456\|\[X\]\|lorem` | Plausible figures and names |
| CPY-08 | Template character words in direction or copy. Banned list: clean, modern, sleek, minimal, premium | Code: `rg -ni 'clean\|modern\|sleek\|minimal\|premium'` | Concrete words from the product |
| CPY-09 | Unverifiable claims (`Loved by 10,000+ teams`, 5 stars, `10x faster`) | Shot | Ask. Make it quiet and specific if real, else remove |
| CPY-10 | `PRO`, `New ✨`, `Beta 🚀` badges; product name with "AI PRO" bolted on | Shot | Remove, or one quiet text badge |
| CPY-11 | Prose slop: "not X, it's Y", em dashes, filler adverbs, pull-quote one-liners | Code: `—`; read the copy | Active, specific sentences. See stop-slop in sources.md |

## Components (CMP)

| Id | Looks like | Detect | Fix |
| --- | --- | --- | --- |
| CMP-01 | Glowing pills for counts, plans, shortcuts, status | Shot | Quiet mono text; shortcuts as `kbd` |
| CMP-02 | Everything a full pill (search, buttons, cards) | Code: `rounded-full` on non-avatar, non-chip elements | Radius by size; nested radius math |
| CMP-03 | One 12 to 16px radius on everything | measure.js: 1 radius value across all levels | A radius per nesting level (tokens.md, Radius) |
| CMP-04 | Card inside a card | Code: `card` nested in `card` | One surface; group with dividers |
| CMP-05 | Charts with rainbow, glowing or pill bars, uppercase day labels | Shot | One series accent, muted grid, mono labels |
| CMP-06 | Every chart in shades of the accent | Shot | Neutral steps; accent on the one thing that matters |
| CMP-07 | Sparklines or mini bars in every stat card | Shot | Label, figure, delta with baseline. Sparklines allowed inside table rows only (defaults C14) |
| CMP-08 | Equal cards side by side with the same content | Shot | One main chart, compact stats, varied widths |
| CMP-09 | Logo as gradient tile, sparkle or glossy orb | Shot | Wordmark in the main family plus a flat one-color mark |
| CMP-10 | Missing control states | Code: no `:focus-visible`; Tab through the screen | All 8 states ([states.md](states.md)) |
| CMP-11 | Thick progress ring that reads as a spinner; bars that cut through figures | Shot | Thin ring or bar; bars contained so figures stay readable |
| CMP-12 | Missing data states, or a shimmer skeleton | Code: no loading, empty or error branch; `skeleton` or `animate-pulse` on placeholders | All six data states; flat bars at real size ([states.md](states.md)) |
| CMP-13 | Status dot or middle-dot meta strings used as decoration | Shot | Dot only where the status is live and real |

## Landing pages (LND)

| Id | Looks like | Detect | Fix |
| --- | --- | --- | --- |
| LND-01 | Pill badge above the headline (`✨ Introducing X 2.0`) | Shot | Remove, or a quiet text link if real news |
| LND-02 | Headline that fits any product (`Supercharge your workflow with AI`) | Name-swap test | What it does for whom, in its own nouns, 7 words or fewer |
| LND-03 | Everything stacked and centered | Shot: more than 72% of the page centered | Asymmetric split or full-bleed scene |
| LND-04 | 3 or more hero buttons, chips or avatar rows under the CTA | Shot | One primary, at most one secondary |
| LND-05 | Hero headline, sentence or CTA below the fold at 1280x800 | Screenshot at 1280x800 | Fit all three in the first view |
| LND-06 | 3 identical icon feature cards | Shot | Fewer features, concrete copy, line icons or none |
| LND-07 | Fade-up on every section; parallax | Code: `whileInView\|data-aos\|animate-fade` repeated | One entrance on load, none on scroll |
| LND-08 | Floating pill nav, fake dashboard hero, hand-drawn browser window | Shot | Quiet nav; real product preview in code |
| LND-09 | More than about 80 words per screen; more than 450 visible words per page | Count | Cut copy |

## Mobile (MOB)

| Id | Looks like | Detect | Fix |
| --- | --- | --- | --- |
| MOB-01 | Initials circles where photos exist | Shot | Real photos |
| MOB-02 | Flat cartoon clip art (purple barbell, flat train) | Shot | One rich illustration or object from the world, or none |
| MOB-03 | Saturated blue or purple primary button | Shot | Near-black pill (light) or off-white pill (dark) with a specific verb (`Show ticket`) |
| MOB-04 | System blue, green, red on a dark ground | Code: `.blue\|.green\|.red`, `#007AFF` on dark | Toned semantic colors from the ramp |
| MOB-05 | Inputs under 16px on touch; `maximum-scale=1` | Code | 16px on touch; never block zoom |
| MOB-06 | Bare `.spring()` or bouncy springs on plain UI | Code: `\.spring\(\)` | Named presets (motion.md) |

## Visuals (VIS)

| Id | Looks like | Detect | Fix |
| --- | --- | --- | --- |
| VIS-01 | Glossy 3D blobs, orbs, liquid chrome, purple nebula | Shot | The product, or one concrete object from its world |
| VIS-02 | Robots, glowing brains, circuits for AI | Shot | Show what the AI produces |
| VIS-03 | Text or fake buttons baked into an image | Shot | Real text in the page |
| VIS-04 | Image with a hard edge and a different black | Shot | Match the page ground; soft edge mask |
| VIS-05 | A visual on every section | Count | One visual where it helps, usually the hero |

## Motion (MOT)

| Id | Looks like | Detect | Fix |
| --- | --- | --- | --- |
| MOT-01 | Pulse or ping on things that are not live | Code: `animate-pulse\|animate-ping` | Static |
| MOT-02 | Catch-all transitions | Code: `transition-all\|transition:\s*all` | Named properties (`transition-colors`, `transition-[transform,opacity]`) |
| MOT-03 | Hover scale on cards | Code: `hover:scale-` on cards | Color or surface step on hover; press scale 0.97 to 0.98 |
| MOT-04 | Animated layout properties | Code: `transition.*(width\|height\|top\|left\|margin)` | Transform and opacity |
| MOT-05 | Everything flies in on load | Shot: more than one entrance | One fade and rise, stagger at most 6 items |
| MOT-06 | No reduced-motion fallback | Code: no `prefers-reduced-motion\|motion-reduce:` | Fewer, gentler motion, not none |
| MOT-07 | Hardcoded one-off durations | Code: several distinct `duration-` values | Duration tokens (motion.md) |

## Substance (SUB)

App screens. These are the tells of a screen that is tidy but says nothing [T].

| Id | Looks like | Detect | Fix |
| --- | --- | --- | --- |
| SUB-01 | No question: the biggest block is decoration or a generic chart | Ask "what does this screen answer?"; compare with the biggest block | Biggest block answers the question ([prework.md](prework.md)) |
| SUB-02 | No finding: nothing says what needs attention today | Shot: no sentence under the title | One finding under the title, beside its action |
| SUB-03 | Numbers that do not add up (rows vs total, segments vs 100%) | Sum the shown rows | Sample data file with computed totals and an assertion |
| SUB-04 | Numbers without units or windows ("1,284", "+12%") | Shot | Unit and window on every number |
| SUB-05 | Frequent job buried (two or more clicks from the first screen) | Walk the top job | One click from the first screen |
| SUB-06 | Layout breaks on hostile content (long name, large text, two-line row) | Stress tests ([states.md](states.md)) | Wrap or truncate with a full-text title; rows grow |

## Agent tools (AGT)

| Id | Looks like | Detect | Fix |
| --- | --- | --- | --- |
| AGT-01 | "AI-POWERED" badges and sparkles instead of evidence | Code: `AI-\|Sparkles`; Shot | A trace or log of what the agent did [RW] |
| AGT-02 | Spinner or "Thinking..." as the only status | Shot | Queue state, attempt count, elapsed time, header metrics [RW] |
| AGT-03 | State shown by color only | Grayscale screenshot | Fill patterns (stripes thinking, solid tool call, outline waiting) plus a legend [RW] |
| AGT-04 | Generic step names ("Step 3", "Tool call") | Shot | "[Action] [Target] [Service]"; agents "[Role] [Model]" [RW] |
| AGT-05 | Failure shown as a red icon with no cause | Shot | Plain-word cause in the tooltip or row [RW] |
| AGT-06 | Empty queue blank or a mascot | Shot | "Nothing waiting" in muted text inside the frame [RW] |

## Template look (TPL)

Not slop, but what a fixed screen falls back to when nobody decided. Check after the passes.

| Id | Looks like | Detect | Fix |
| --- | --- | --- | --- |
| TPL-01 | Pure grey #161616, Inter, white text, old brand color on one button, on a warm or bright product | Shot | Ramp tinted to the world; accent from it |
| TPL-02 | Headline that survives the name swap | Name-swap test | Product's own nouns |
| TPL-03 | Hero visual is an empty box or a generic picture | Shot | Product preview in code or a world scene |
| TPL-04 | "Avoidance" page: every tell removed, nothing added, reads thin | Shot | Add substance: bigger type, a field of color, real pictures |
| TPL-05 | Gallery fashion as house style: mono micro-labels, 01/02/03 numbering, hairline boxes everywhere, zero radius | Shot | Allowed on dense app screens only, not as page decoration |

---

Tells adapted from unslop by Damir Sokolovsky (@heydamir), CC BY 4.0, with additions from taste-skill (MIT), Hallmark (MIT), Fluid Functionalism (MIT), swiftui-microinteractions (MIT) and observed before/after posts. Changes: condensed, given ids and detection patterns, mapped to DaisyUI v5. See [sources.md](sources.md).
