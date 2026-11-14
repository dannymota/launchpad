# Sources, credits and licences

## Credit

This skill adapts **unslop by Damir Sokolovsky (@heydamir)**, licensed CC BY 4.0.
- Repo: https://github.com/heydamir/unslop
- Author: https://x.com/heydamir, https://heydamir.design/unslop
- Licence: https://creativecommons.org/licenses/by/4.0/

Changes made to unslop material: adapted and condensed into our own words; workflow restructured around surface detection (web app, dashboard, mobile, landing, form, settings); tells given ids and detection patterns; numbers split into App, Marketing and Mobile columns and merged with values from the sources below; color, radius and control tokens remapped to a DaisyUI v5 custom theme; grade criteria, pre-work (data inventory, question, finding, sample data), data states and stress tests, an independent review with scores and caps, a seventh surface (agent tools), per-surface defaults, proof format, and measure and redline scripts added. The story-video recipe is summarised in one paragraph in proof.md; its snapshot scripts were not copied. No unslop images were copied.

Any before/after video made with this skill must carry the credit "unslop by @heydamir".

## Source tags

Tags in brackets across the reference files point here.

| Tag | Source | Licence | Used for |
| --- | --- | --- | --- |
| U | heydamir/unslop, `SKILL.md`, `references/signs.md`, `references/tokens.md` | CC BY 4.0 | Workflow, 9-pass order, direction lines, tells, spacing scale, ramps, type scale, radius, icons, motion durations and easing, semantic colors, name-swap (template) test |
| H | nutlope/hallmark v2 (https://github.com/nutlope/hallmark), "The Floor" and hero rules | MIT, (c) 2026 Hallmark contributors | 1280x800 hero rule, 80 words per screen, 7-word headline, 12-word sentence, 6 to 9 sections, 450 words, body 16+, container cap, no eyebrows, focus-visible, reduced motion |
| T | Leonxlnx/taste-skill v2.1 (https://github.com/Leonxlnx/taste-skill), `references/tells.md`, `app-screens.md`, `critique.md` | MIT, (c) 2026 Leonxlnx | Dated tells, 72% centered, 12 to 16px single-radius tell, sidebar median 230, control median 34, KPI median 26, 4 to 9 sizes (median 6), app figures under 48, status pill pairs, #247b50 text green, accent share 3% or less, group-don't-box, 3x type jump, "avoidance" thinness |
| F | mickadesign/fluid-functionalism (https://github.com/mickadesign/fluid-functionalism), `skills/fluid-functionalism/references/craft.md` | MIT, (c) 2026 Micka Touillaud | Spring tiers 0.08/0.16/0.24s and exits, density 36/28, type roles 13/20 body, 16/22 title, 16px touch inputs, overlay +6%/+10% and 4%/7%, concentric radius, sidebar 160 to 360, gliding highlight, optical weight swap. shadcn-based: values only |
| S | iAmVishal16/swiftui-microinteractions (https://github.com/iAmVishal16/swiftui-microinteractions), `SKILL.md` | MIT, (c) 2026 Vishal Paliwal | Spring presets 0.35/0.6, 0.4/0.65, 0.45/0.7, 0.6/0.8; no bare `.spring()`; press scale 0.96 / 0.965 / 0.90; opacity ladder; no system colors on dark |
| P | hardikpandya/stop-slop (https://github.com/hardikpandya/stop-slop) | MIT, (c) 2025 Hardik Pandya | Prose rules for UI copy, 5-dimension score, revise under 35/50 |
| R | @_heyrico app UI cheatsheet, https://x.com/_heyrico/status/2092627892270403854 | X post, paraphrased | Badge 20 high radius 6 with tint, data rows 40, switch 24x14 with 10px thumb |
| I | Image posts: @yasirahmadnoori Fulcrum before/after (https://x.com/yasirahmadnoori/status/2113225762115338729, https://x.com/yasirahmadnoori/status/2112411693662031935); @marcelkargul badge Do/Don't (https://x.com/marcelkargul/status/2115949035009814905); @thorstenball measured fix (https://x.com/thorstenball/status/2113988764364398882); @abdushbag dropdown variants image (https://x.com/abdushbag/status/2113010357908525469) | X posts, paraphrased; images not copied | Context line on stats, dot-matrix chart, axis units, right-aligned figures, tinted pills, softer modal with off-white primary, ringed swatches; tint badge with dark text; measure-and-prove workflow; dropdown variants by need |
| X-meer | @_meer_habib, https://x.com/_meer_habib/status/2115854858184208767 | X post, paraphrased | Purple gradients, emoji and red on every number as mobile tells; 5 passes |
| V-xn | Video notes, batch x item n (below) | X videos, described in our words; videos not copied | Observed before/after values |
| RW | Rewatch notes on the saved demo videos (batches 1 to 5): on-screen labels and values transcribed in our words | X videos, described; videos not copied | Pass order, from -> to labels, color counts, Glaze copy transforms, agent trace and queue details, late motion values, Ember hero sizes, mobile inbox panels |
| X:handle | An X post or reply, linked below | X posts, paraphrased | Method notes (see "X posts" below) |
| D | Default chosen by this skill | n/a | Marked wherever no source gives a number |

Conflicts between sources (C1 to C15) are resolved in [defaults.md](defaults.md), using the resolutions proposed in the designers' system review. Taste-skill citations also cover its `references/app-screens.md` (data inventory, question and finding, states, settings, mobile folding) and `references/critique.md` (scores, caps, rounds). Hallmark citations also cover `references/redesign.md` and `references/review-finish.md` (kept wiring, fresh-context review, "what did the old page do better"). Fluid citations also cover `references/stack-audit.md` (evidence gate).

## X posts

| Tag | Post | Used for |
| --- | --- | --- |
| X:seanaiux | https://x.com/seanaiux/status/2115812084147683607 and replies | Keep the layout; work from a component library and a rulebook |
| X:jaimintf | https://x.com/jaimintf/status/2116193966655934968 and replies | Feed 3 to 5 reference apps and copy structure; mobile inbox panels; tinted-badge contrast replies |
| X:roadsteralex | reply in the jaimintf thread | Sameness risk: borrowed structure can read as a clone |
| X:eclarkhalid | reply in the jaimintf thread | Stress test with large text, long names, two-line previews |
| X:zander_supafast | https://x.com/zander_supafast/status/2115804919303172360 | Outside-in form spacing |
| X:tobiadonadon_ | https://x.com/tobiadonadon_/status/2115849655468597454 | Same-prompt comparison, one-shot vs skill |
| X:thorstenball | https://x.com/thorstenball/status/2113988764364398882 | Measured fix with cause and px positions |
| X:romeopotapov | https://x.com/romeopotapov/status/2116176455361307058 | Sometimes the structure must change |
| X:oritorii | reply to https://x.com/heydamir/status/2116158176336970008 | Dark backgrounds as a slop sign |
| X:marcelkargul | https://x.com/marcelkargul/status/2115949035009814905 | Hand-finished afters; tinted badges |

## Video notes index

The first notes describe 24 of 27 saved demo videos; the rewatch notes [RW] add on-screen labels for all batches, including the three missing (voice dictation, Ember hero, mobile inbox). The watcher did not always record post ids, so items are matched to posts by content where possible.

| Tag | What it shows | Likely post |
| --- | --- | --- |
| V-A1 | Mobile wallet: gradient to dark grey, emoji to SF Symbols, "Hey Ava! 👋" to "Wallet", card #131316 with one green glow, gutters 14 to 24pt, rolling digits | https://x.com/_meer_habib/status/2115854858184208767 |
| V-A2 | CRM "OutpostAI PRO" to "Outpost", greeting removed, glowing pills to pastel rectangles with dot | dashboard unslop posts (rehanxahmed / seanaiux / marcelkargul) |
| V-A3 | transitions.dev effects: chart-morph 400ms, tabs 250ms, value snap 200ms blur 2px, card expand 350ms spring | https://x.com/Jakubantalik/status/2113656694303551906 |
| V-A4 | Ember finance dashboard: greeting to "October 2026", pill bars to spline charts, spacing guides first | https://x.com/heydamir/status/2116158176336970008 or 2115063463063998736 |
| V-A5 | Mobile messages: photos, gap 14, gutter 24, rows 98 to 80, chips 36, radius 22, SF Pro 27/16/14 | https://x.com/seanaiux/status/2115425851374223811 (likely) |
| V-A6 | Mobile study app: emoji stripped, gap 24, padding 20, radius 28, Jakarta 28/18, glass tab bar | a mobile unslop post (unconfirmed) |
| V-A7 | design.how Glaze promo: purple AI apps to restrained; SF Pro 15 at 72% white, New York Medium 28 | https://x.com/arlanmarat/status/2113661728563290358 |
| V-A8 | Mobile fitness: flat purple barbell to 3D character, black pill CTA | https://x.com/tobiadonadon_/status/2115849655468597454 (likely) |
| V-B1 | Train app: spacing 14/27/16/12/24/11 to 24/12/10/18/14/14, side padding 15/20 to 12/16, rich illustration, black pill "Show ticket" | a rehanxahmed or jaimintf post (unconfirmed) |
| V-B2 | "SalesPro CRM" to "Orbit": tone down + monochrome, frosted glass, emoji to line icons, Arial Bold to Geist, monochrome area chart | https://x.com/Suryansh777777/status/2115807617339531383 (likely) |
| V-B3 | Fitness to "Xeyo": signal red accent, off-white dot grid, Geist 34/500, 24/500, 68/200 | a mobile unslop post (unconfirmed) |
| V-B4 | Running app: #000000 to #09090B, glass 7%/10%, 1.5px line icons, dot-matrix 7px numerals, "GPS READY" | a mobile unslop post (unconfirmed) |
| V-B6 | Agent orchestrator timeline | https://x.com/eliakuratli/status/2112614855484358982 |
| V-B7 | SVG motion with bouncy spring (character animation, not UI) | https://x.com/rossark0/status/2113149312163045837 |
| V-B8 | Token tool: type 28/20/16/14/13/12, weights 700/600/400 | https://x.com/MichaelFilipiuk/status/2115791791568105887 (likely) |
| V-C1 | taste-skill reel: spinner-like ring and bars cutting figures fixed; chart takeaways; designed loading and empty states | https://x.com/LexnLin/status/2112674349132194185 |
| V-C2 | EmberAI landing: blob and "Supercharge" to "Invoices that chase themselves", pixel-art plane, product card | https://x.com/heydamir/status/2116158176336970008 (likely) |
| V-C3 | Agent jobs queue | https://x.com/flohoeller/status/2113302692478992597 |
| V-C4 | Trace waterfall tooltips | https://x.com/haaarshsingh/status/2113295780450587049 |
| V-C5 | UIArc interactions: morph to "Saved", hold-to-confirm, gliding radio ring | https://x.com/neropursue/status/2112461713119285748 |
| V-C6 | Ground station telemetry with tabular numbers | https://x.com/disarto_max/status/2113679847801471131 |
| V-C7 | Invoice node builder: gaps 15/32/60/3.5 to light canvas, grey hairlines, run timeline | a dashboard unslop post (unconfirmed) |
| V-C8 | Form spacing system 48/40/8/24/8/20/4/24/8 | https://x.com/zander_supafast/status/2115804919303172360 |

## Websites and paid or unlicensed sources (linked, paraphrased, nothing copied)

- design.how (design systems for agents, shadcn registry): https://design.how
- transitions.dev (motion recipes, `npx transitions-agent` motion score): https://transitions.dev
- details.so (paid inspiration library): https://details.so
- affectui.com (agent UI components, partly paid): https://affectui.com
- uiarc.dev (animated components, shadcn CLI): https://uiarc.dev
- kobra.systems (trace waterfall): https://kobra.systems
- impeccable.style, emilkowal.ski "You don't need animations", designsystemchecklist.com
- Revolut workflow post (article paywalled; only post text used): https://x.com/guilleflorvs/status/2114746214528778424

## Stack rule

New product apps use DaisyUI v5 + Tailwind 4 with a custom `data-theme`. Sources built on shadcn (Fluid Functionalism, design.how, uiarc, kobra, coss, reui, beui) are references for values and behavior only. Do not install their components into a new product app.

## Other conflicts resolved

| Conflict | Resolution |
| --- | --- |
| Weights: unslop 400/500 (600 max) vs Fluid 400/550/700 display vs a video using 700/600/400 | 400/500 default, 600 for one emphasis role. 700+ only with a written reason |
| Light hero figure (Geist 68/200) and bold wallet balance (64/700) vs weights 400 to 600 | defaults.md C6: one weight outlier for the one hero figure |
| Body size: Hallmark 16+ (pages) vs 13 to 15 (apps) | Split by column: Marketing 16 to 18, App 13 to 15, Mobile 14 to 16 with 16px inputs |
| Page title: unslop 28 to 36 vs taste median 24 and app figures under 48 | App page title 24 to 32; KPI 26 to 32 |
| Sidebar: unslop 240 to 280 vs taste median 230 vs Hallmark's destination rule | defaults.md C9: sidebar only past about 7 destinations on new apps; widths 224 to 280; DaisyUI `w-60` (240) default |
| Radius: unslop cards 12 to 16 vs taste bimodal 4 to 8 or 16 to 24 | defaults.md C7: pick tight or soft once per product; theme default soft (cards 16, controls 8) |
| Mono meta and hairlines: unslop uses them; taste bans them as page decoration | Allowed on App screens; not as Marketing decoration (TPL-05) |
| Glass: unslop and taste ban it; videos show glass 7%/10% | defaults.md C3: iOS 26 system chrome only, 7 to 10% |
| Mobile values off the 4px grid (gap 14, title 27, rows 98) | Recorded as observed. Snap to the 4px grid on build (14 -> 12 or 16; 27 -> 28) [D] |
| Press scale: unslop 0.97 to 0.98 vs SwiftUI 0.96 | Web 0.97 to 0.98; iOS 0.96 (rows 0.965, round buttons 0.90) |
| Light success green: unslop #16a34a vs taste #247b50 for text | Theme `success` = #247b50 because DaisyUI soft badges render the token as text |
| Render limit (unslop: 3) vs "repeat until no slop" | Loop up to 3 rounds (render, re-grade, independent review), then report open tells and say plainly if the score is under 7.5 |
| Form spacing: zander 20 between fields vs taste 16 | zander's table for standalone forms and dialogs; taste's for dense in-page forms |
| DaisyUI `skeleton` vs "no shimmer" loading | `skeleton` shimmers in DaisyUI 5 (measured); use flat `bg-base-300` bars |
