# Surfaces

Classify the surface before the audit. It picks the token column, the direction focus, the slop-to-fix table and the defaults column in [defaults.md](defaults.md). A screen can hold two surfaces (settings is a web app with forms); run both tables. Tags point to [sources.md](sources.md).

| Surface | Class | Detect it by | Token column | Direction focus |
| --- | --- | --- | --- | --- |
| Web app | app screen | signed-in shell, sidebar or top nav, lists, detail views, inbox, chat | App | Signature in the nav or the main object |
| Dashboard | app screen | KPIs, charts, tables on one view | App | Moment = the main chart; finding under the title |
| Mobile | mobile app screen | viewport under 600px, SwiftUI, Jetpack Compose, React Native, Expo, tab bar | Mobile | Moment = the hero figure or object |
| Landing | page | logged-out page, hero, CTA, sections | Marketing | Moment = hero scene or product preview |
| Form | app screen or page | 3 or more inputs with a submit: signup, checkout, create dialog | App (Mobile on phones) plus Form spacing | Signature in the confirmation or helper copy |
| Settings | app screen | grouped preferences, toggles, account, billing | App plus Form spacing | Quiet; Moment is a preview of what a setting produces |
| Agent tool | app screen | runs, traces, queues, tool calls, model names, token or cost counts, an assistant panel | App | Moment = the trace or the queue; Signature = how state is drawn |

Classes follow taste-skill: a **page** is read and scrolled; an **app screen** is worked in; a **mobile app screen** is an app screen under platform rules; a **component** is judged alone [T]. Rules differ by class: pages get Marketing copy limits and may have one entrance; app screens get no entrances and the question/finding pre-work ([prework.md](prework.md)).

Each table row: tell id (from [tells.md](tells.md)) -> detect -> fix with numbers -> DaisyUI v5 classes. Numbers come from [tokens.md](tokens.md).

## 1. Web app

| Tell | Detect | Fix | DaisyUI v5 |
| --- | --- | --- | --- |
| CPY-01 greeting title | `Welcome back` in h1 | h1 = page noun ("Inbox", "Deals") or a summary of the state ("19 open, 4 won") [U, T, RW] | |
| CPY-10 "AppAI PRO" name | badge next to logo | Product name only, AI/PRO dropped; flat mark [U, V-A2] | |
| SPC-02 uneven nav rows | row heights differ | Rows 32 to 36, gap 2 to 4; label 24 above / 8 below [U] | `menu menu-sm`, `menu-title` |
| COL-07 saturated sidebar, colored active pill, left bar | Shot | Sidebar on the page ground; neutral pill, one surface step [T, U] | `menu-active` with `bg-base-300` |
| Sidebar on a small app | count destinations | Fewer than about 7 destinations: top bar instead (new apps only; keep existing sidebars and fix width) [H, defaults C9] | `navbar`, `menu menu-horizontal` |
| ICO-01 emoji nav icons | emoji grep | lucide 16, stroke 1.5, `text-ink-3`, gap 8 [U] | |
| CMP-04 card in card | nested `card` | One surface, dividers | `card card-border`, `divider` |
| CMP-10 missing states | Tab through | All 8 control states ([states.md](states.md)) | `btn`, `loading loading-spinner loading-sm` |
| ICO-05 sparkle on AI panel | `Sparkles` | Plain label, real suggestions [I] | |
| Layout cramped | narrow centered column | Sidebar 224 to 280, top bar 56 to 64, content capped 1440 to 1600 [U] | `drawer lg:drawer-open`, `navbar` |
| Rows with chip + avatar + kebab each | Shot | One action where needed, right-aligned; smaller avatars [T, RW] | `list-row`, `avatar` |
| Chat: bubbles in saturated fills | Shot | Neutral bubbles; accent on the user's own bubble or none [D] | `chat`, `chat-bubble`, `chat-bubble-neutral` |
| Toast for every action | Code | Confirm in place (button morphs to check); a toast only when context changes [RW] | `swap`, `toast` |

## 2. Dashboard

| Tell | Detect | Fix | DaisyUI v5 |
| --- | --- | --- | --- |
| CMP-08 equal tiles | 4 identical cards with charts | One main chart (2/3 width, 280 to 360 tall) beside a list; varied spans [U, T] | `card`, `grid grid-cols-3` with `col-span-2` |
| CMP-07 KPI cards with icon circle, sparkline, green pill | Shot | One divided container: label over value, delta in words with its window. No sparklines on KPIs; allowed in table rows [U, T, defaults C14] | `stats stats-horizontal`, `stat-title`, `stat-value tabular-nums`, `stat-desc` |
| No finding | the title is the only text | One sentence under the title with the fact that needs attention and its action [T, RW] | `text-ink-2`, `btn btn-sm` |
| CPY-03 bare delta | `+12%` alone | "+12% vs last month" [U, I] | `stat-desc` |
| CMP-05 rainbow or glowing bars | Shot | One hue on the main series, neutrals for the rest; muted grid; mono or muted axis labels with units ($300K). One glow allowed on the main line [U, I, V-B2, defaults C4] | |
| Chart that is only bars | Shot | Say what happened: annotate the spike with the real event ("401(k) rollover +$38,400.00") [RW, T] | `tooltip` |
| Fat donut with slice labels | Shot | Thin ring with the legend as a table, or one stacked bar [T, H] | `progress` |
| COL-09 red/green everywhere | Shot | Neutral figures; semantic color on the delta only; one red mark per object at most [U, T, X-meer] | `text-success` / `text-error` on delta |
| Zebra table, uppercase headers | Shot | 12px grey sentence-case headers, row rules, right-aligned tabular figures, tinted status pills [T, I] | `table table-sm`, `badge badge-soft badge-sm` |
| Greeting header | `Welcome back` | Period selector ("October 2026") [V-A4, RW] | `dropdown`, `btn btn-sm btn-ghost` |
| Numbers that do not add up | sum the rows | Totals computed from the sample data file ([prework.md](prework.md)) [T] | |
| "--" at 24px for missing | Shot | Small grey dash; zero printed as zero [T] | `text-ink-3` |
| Glowing nodes on purple (builder) | Shot | Light canvas, white cards with 1px grey borders, thin bezier edges, steps as a vertical timeline [V-C7, RW] | `card card-border`, `timeline timeline-vertical` |

## 3. Mobile (iOS and Android)

### Platform defaults

| Rule | iOS | Android | Source |
| --- | --- | --- | --- |
| Touch target | 44pt minimum | 48dp minimum | T, S; Android value [D] from platform guidance |
| Navigation | 48 top bar or a 4 to 5 tab bottom bar; never a sidebar | same; bottom navigation | T |
| Tables | become 2-line rows (title + meta, figure right) | same | T |
| KPI grid | 2 columns | 2 columns | T |
| Modals | system sheet, NavigationStack push, system loader; no custom modal | bottom sheet, system dialogs | S; Android [D] |
| Icons | SF Symbols | Material Symbols | RW, D |
| Springs | explicit presets only (see [motion.md](motion.md)); loaders linear | platform motion | S |
| Press | scale 0.96 with a haptic on the down edge | ripple, no scale [D] | S |
| Text inputs | 16px or larger | 16sp or larger [D] | F |
| Text size | Dynamic Type; test the largest size ([states.md](states.md)) | font scale 2.0 | X:eclarkhalid, D |
| Glass | iOS 26 system chrome only (tab bar, search, toolbar), fill 7 to 10% | none | defaults C3, V-B4 |
| System colors on dark | tune accents; never raw `.blue` / `.green` / `.red` | same with Material roles | S |

### Slop to fix

| Tell | Detect | Fix | DaisyUI v5 (mobile web) |
| --- | --- | --- | --- |
| COL-01 purple/magenta gradient | Shot | Dark ground #09090B, cards #131316, or white; one accent or one glow on the hero object [V-B4, V-A1] | `bg-base-200` with the dark theme |
| CPY-01 "Hey Ava! 👋" | Shot | Big left-aligned title = context ("Wallet", "Morning run") 27 to 34/500 [V-A1, V-B3, RW] | |
| ICO-01 emoji actions and avatars | emoji grep | Platform icons, stroke 1.5; real portraits for people [V-A1, V-A5, RW] | `avatar`, `avatar-group` |
| SPC-05 off-grid gutters (14) | DevTools | Gutter 24, group gap 24, card padding 20 [V-A1, V-A6] | `px-6`, `gap-6`, `p-5` |
| Rows too tall | row 98 in a dense list | Rows 80 with photo; two-line rows 56 to 92. 98pt rows only for sparse consumer lists [V-A5, T, RW] | `list`, `list-row` |
| Dividers in tall rows | Shot | Whitespace, only when rows are tall [RW] | |
| MOB-03 saturated blue CTA "Start 🚀" | Shot | Black pill (light) / off-white pill (dark), specific label ("Show ticket", "Continue: Full Body Strength") [V-A8, V-B1] | `btn btn-primary btn-lg rounded-full` |
| Secondary AI banner in the main task | Shot | Remove it from the primary flow [RW] | |
| Flat tab bar with emoji | Shot | 4 to 5 line icons with labels; glass only on iOS 26 system chrome [T, defaults C3] | `dock`, `dock-active`, `dock-label` |
| MOB-02 boxed flat clip art | Shot | One edge-to-edge rich illustration or 3D object from the world (consumer only) [V-B1, V-A8, RW] | |
| Sidebar or 4 squeezed KPI columns on a phone | 390 shot | Tab bar; 2-column KPI grid; tables to 2-line rows [T] | `dock`, `grid grid-cols-2`, `list-row` |
| TYP-03 many sizes | measure.js | Title 27 to 28, heading 18 to 20, names 16, body 14 to 16 [V-A5, V-A6, RW] | |
| MOB-05 small inputs | `font-size` under 16 | 16px on touch; no `maximum-scale=1` [F] | `input text-base` |
| Static balance | Shot | Digits roll on change (`numericText`), rows spring in [V-A1, RW, S] | `countdown` only for real counters |

## 4. Landing

| Tell | Detect | Fix | DaisyUI v5 |
| --- | --- | --- | --- |
| LND-02 generic headline ("Supercharge Your X With AI ✨") | name-swap | What it does for whom, 7 words or fewer, the product's own nouns ("Invoices that chase themselves") plus one plain sentence [H, V-C2, RW] | |
| LND-01 "Introducing" pill, 5 stars | Shot | Remove [U, T, RW] | no `rating` |
| LND-03 centered stack with blob | over 72% centered | Asymmetric split (text 728 beside visual 728x648 at 1440) or a full-bleed scene with text on calm space [U, T, RW] | `hero`, `hero-content`, `grid lg:grid-cols-2` |
| VIS-01 3D blob, robot, brain | Shot | A metaphor from the product world (a paper plane for sent invoices) with real status tags ("Paid $4,200", "Reminder 2") and a product peek with real numbers [V-C2, RW, U] | nested `data-theme` on the preview `card`, `badge badge-soft` |
| CPY-09 "Loved by 10,000+ teams" | Shot | Ask; specific or remove [U, H] | |
| COL-03 glowing borders | Shot | Hairline 8% [U] | `card card-border` |
| LND-04 "Get Started Free ⚡" glow + 3 buttons | count | One primary 44 to 48 tall ("Start for free"), one quiet secondary ("Watch demo") [U, RW] | `btn btn-primary btn-lg`, `btn btn-ghost btn-lg` |
| LND-05 below fold | 1280x800 shot | Headline, sentence, CTA in view [H] | |
| LND-09 wordy | count | About 80 words per screen; 450 per page; 6 to 9 sections [H] | |
| 3 identical icon feature cards | Shot | Each section its own blueprint; neighbours differ [T] | |
| Fade-up on every section | Code | One entrance plus one signature move (tunable, defaults C2) [U, H] | |
| Body under 16 | computed style | Body 16 to 18; hero 56 to 72, -0.03em [H, U] | |

## 5. Forms

### Spacing, outside in [V-C8, X:zander_supafast]

| Gap | Value | Applies to |
| --- | --- | --- |
| Container, top and bottom | 48 | padding of the form card or dialog body |
| Container, sides | 40 | same; on phones drop to the page gutter (16 to 24) [D] |
| Header to caption | 8 | form title to its one-line description |
| Between groups | 24 | one fieldset to the next ("Account" to "Billing"); also caption to first group |
| Label to input | 8 | the label's bottom to the control's top |
| Between fields | 20 | one field block (label + input + helper) to the next, inside a group |
| Input to helper | 4 | the control's bottom to helper or error text |
| Helper to submit | 24 | the last field's helper (or input) to the action row |
| Between buttons | 8 | Cancel to Submit, and any secondary buttons in the action row |

Taste-skill measured tighter values on app screens: 24 from description to first label, 16 between fields, 16 to Save [T]. Use them for dense in-page forms; use the table above for standalone forms and dialogs.

### Slop to fix

| Tell | Detect | Fix | DaisyUI v5 |
| --- | --- | --- | --- |
| SPC-06 guessed spacing | DevTools | The table above | `fieldset`, `fieldset-legend`, `label` |
| Placeholder as label, instructions in placeholder | no `<label>` | Label above, 14/500; placeholder shows a format ("e.g. 2026-10-30") [T, H] | `label`, `input` |
| Inconsistent field heights | DevTools | One control height: 32 to 40 App, 44 or more touch [T, U] | `input input-sm` (32) or `input` (40), measured |
| Unreadable disabled | Shot | Legible disabled that says why [T] | `input` with `disabled` plus helper text |
| Saturated color swatches | Shot | Rounded squares with a ring on the selected one [I] | |
| Generic submit ("Submit") | Shot | Verb plus object ("Create flow") [D] | `btn btn-primary` |
| No inline validation | Code | Error in the helper slot, 4 below the input, in plain words [V-C8, H] | `validator`, `validator-hint`, `input-error` |
| Dark heavy modal, saturated primary | Shot | Softer grey surface, off-white primary [I] | `modal-box`, `modal-action`, `btn btn-primary` |
| Sizes 28/20/16/14/13/12, weights 700/600/400 | measure.js | Labels 14/500, helper 13/400 [RW] | |
| Touch zoom | input font under 16 | 16px on touch [F] | `text-base` |

## 6. Settings

### Layout and save model [T]

- One view per area (Profile, Billing, Notifications), never one long page. Sub-nav on the left, the same rules as Web app nav.
- Each section: a label column (about 450 wide: title 14/500 and one helper line 13/400) beside a panel (about 700 wide) with the controls. Under 1024 wide the label column stacks above the panel.
- One save model per view, never mixed: autosave with a "Saved" stamp beside the changed control, or one Save button per panel, bottom right, disabled until something changed.
- Show what a setting produces: a preview of the theme, the email, the invoice, the notification.
- Danger actions in one zone at the bottom of the view.

### Slop to fix

| Tell | Detect | Fix | DaisyUI v5 |
| --- | --- | --- | --- |
| One long settings page | scroll length | One view per area with a sub-nav [T] | `menu menu-sm` |
| Every setting in its own card | stacked cards | Label column beside one panel per section; rows split by hairlines [T] | `card card-border`, `divide-y divide-base-content/8` |
| Mixed save models | some autosave, some buttons | One model per view [T] | `btn btn-primary btn-sm` or a `text-ink-3` "Saved" stamp |
| Bare controls | Shot | Preview of the result next to the control [T] | nested `data-theme` on the preview |
| Tracked caps group labels | `uppercase` | Sentence case 14/500, helper 13/400 [U, T, RW] | `fieldset-legend` |
| Uneven row heights | DevTools | Rows 44 to 56, label left, control right [D] | `list`, `list-row` |
| Off-palette toggles | saturated toggles | Neutral off, primary on; heyrico switch 24x14 with a 10px thumb as a size reference [R, D] | `toggle toggle-sm toggle-primary` |
| Danger actions mixed in | red buttons everywhere | One danger zone at the bottom, one error button [D] | `btn btn-error btn-outline btn-sm` |
| No save feedback | Code | Save morphs to "Saved" with a check, 120 to 180ms [V-C5, U] | `btn`, `swap` |

## 7. Agent tool

Screens that show what an agent or model did: run traces, job queues, tool calls, an assistant panel.

### What to show [RW, V-B6, V-C3, V-C4]

- **Header metrics** for a run: duration, cost, tokens, LLM calls, tool calls, errors. Mono, tabular.
- **Trace waterfall** with a legend: model call, tool call, waiting, handoff, failed. Encode state with fill as well as color: diagonal stripes = thinking, solid = tool call, outline = waiting. One consistent color per model.
- **Outliers flagged** automatically: a small "SLOWEST" tag on the longest span.
- **Failed spans** say the cause in plain words in the tooltip ("2 of 14 checkout tests fail: coupon codes aren't applied to seat prices").
- **Names**: steps as "[Action] [Target] [Service]" ("Fetch invoices Stripe"); agents as "[Role] [Model]" ("Planner GPT-5").
- **Tooltips** with progressive disclosure: input, output, started, cost. No open delay.
- **Summary line** at the end of a run: "5 agents • 26.4s • 1.5x faster than sequential • $0.16".
- **Queue metrics**: WAITING, RUNNING, THROUGHPUT, WAIT P95, DONE, FAILED. Each job shows its state, "Attempt 1 of 3", and position ("8 of 13") on hover. Pause and resume morph in place. A live dot when the queue is live.
- **Empty queue**: "Nothing waiting" in muted text, inside the queue frame.

Uppercase metric labels are seen in these sources; keep them only if the brand system has them, else sentence case (defaults C5).

### Slop to fix

| Tell | Detect | Fix | DaisyUI v5 |
| --- | --- | --- | --- |
| Sparkle and "AI-POWERED" badges | `Sparkles`, "AI-" | Show what the agent did: the trace with its legend [RW] | |
| Vague status ("Working on it...") | Shot | Header metrics with units [RW] | `stats`, `stat-value tabular-nums` |
| Spinner only | Shot | Queue states, attempt count, elapsed time [RW, V-C3] | `steps`, `badge badge-soft badge-sm`, `status` |
| Generic step names ("Step 1", "Tool call") | Shot | "[Action] [Target] [Service]" [RW] | |
| Color is the only state signal | grayscale shot | Fill patterns plus a legend [RW] | |
| Hidden detail | Shot | Tooltips with input, output, started, cost [RW, V-C4] | `tooltip`, `tooltip-content` |
| Empty queue shows nothing or a mascot | Shot | "Nothing waiting" in muted text [RW] | `text-ink-3` |
| One dropdown for every choice | Shot | Variants by need: single select, multi with search and "3 of 50 selected", state filters with semantic icons [I] | `dropdown`, `filter`, `checkbox checkbox-sm` |
| Greeting in every panel | `Hi`, `Hello` | At most one greeting, in the assistant panel only (defaults C5) | |
| Live numbers jitter | Shot | Mono or tabular figures [V-C6] | `font-mono tabular-nums` |

## Thin spots

Sources are thin here. Rows marked `[D]` fill the gap.

- Android: no Android before/after in the bookmarks. 48dp targets, Material icons, ripple and sheet rules are platform defaults [D].
- Settings: no settings before/after video. Layout and save model come from one taste-skill section [T] plus one rewatch token note [RW].
- Forms: one spacing video [V-C8] and one modal image [I]. No multi-step, checkout or long-form example.
- Agent tool: three to four short videos [V-B6, V-C3, V-C4] and one image [I]. Values for span heights, colors per model and legend size are not given.
- Landing: one landing before/after (Ember). Sections below the hero rely on Hallmark and taste-skill rules.
- Web app (non-dashboard): chat and inbox afters come from mobile videos; desktop chat has no sourced example.
