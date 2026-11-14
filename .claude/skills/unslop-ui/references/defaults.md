# Defaults (tunable per surface)

Where the designers disagree, this skill uses the resolution proposed in the designers' system review (section 9, "Open conflicts"). Each line below is a default, not a law. Change it per surface or per product when the user or the brand system says otherwise, and write the change in the report. Tags point to [sources.md](sources.md).

## How to change a default

1. Name the conflict id (C1 to C15) and the surface.
2. Write the new value and the reason (brand system, user request, platform rule).
3. Apply it to every screen of that surface in the run, not to one screen only.

## The defaults

| # | Topic | Default | Web app | Dashboard | Mobile | Landing | Form | Settings | Agent tool | Sources |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | Pass order | Spacing first. Pass 0 Structure (idea and hierarchy gate) runs before the passes, on heavy grade only | same | same | same | same | same | same | same | U, T, RW |
| C2 | Motion amount | Apps: no entrances. Pages: at most one entrance plus one signature move. A user may ask for a richer staged layer on a landing page | no entrances | no entrances | springs on state change only | 1 entrance + 1 signature move (tunable up) | none | none | none beyond live updates | U, H, T |
| C3 | Glass | Platform glass on iOS 26 system chrome only (tab bar, search, toolbar). Banned on web cards | banned | banned | iOS system chrome only, fill 7 to 10% | banned | banned | banned | banned | T, U, V-A6, V-B4, S |
| C4 | Glow | One glow allowed inside a Moment (a chart line, the hero card). Never on chrome | banned | one, on the main chart line | one, on the hero object | one, in the hero scene | banned | banned | banned | U, V-A1, S |
| C5 | Greetings and uppercase labels | Banned. One greeting allowed in an agent or assistant panel. Uppercase table headers only if the brand system has them | banned | banned | banned | banned | banned | banned | one greeting in the assistant panel | U, T, H, I |
| C6 | Weights for big numbers | 400 and 500; one weight outlier allowed for the one hero figure (light 200 to 300 or bold 700) | outlier only on a hero figure | the main KPI may take the outlier | hero balance or figure | hero stat | none | none | none | U, V-B3, RW, T |
| C7 | Radius | Pick tight (4 to 8) or soft (16 to 24) once per product. Nested math either way. Theme default: soft cards 16, controls 8 | product choice | product choice | soft | product choice | match app | match app | tight suits dense traces | U, T |
| C8 | Mono and hairlines | App: allowed, with one job (figures, ids, timestamps). Page: avoid | allowed | allowed | figures only | avoid | avoid | avoid | allowed (ids, durations, costs) | U, T |
| C9 | Sidebar | New apps: a sidebar only past about 7 destinations, else a top bar. Existing sidebars stay; fix widths to 224 to 280 | rule applies | rule applies | never (tab bar) | n/a | n/a | label column, not a sidebar | rule applies | H, U, T |
| C10 | Layout change | The depth grade decides. Ask before any structure change | ask | ask | ask | ask (hero split is common) | ask | ask | ask | U, H, X:seanaiux, X:romeopotapov |
| C11 | Dark mode | Keep the product's theme. Never switch theme as a fix | same | same | same | same | same | same | same | X:oritorii |
| C12 | Sameness | Borrow structure from reference apps, then require a Signature and a product face | same | same | same | same | same | same | same | X:jaimintf, X:roadsteralex, T |
| C13 | Tinted badges | Pale tint with dark same-hue text. Darken per hue until 4.5:1, and add a dot or icon so color is not the only signal | same | same | same | same | same | same | same | I, X:jaimintf replies |
| C14 | Sparklines | Banned on KPI cards. Allowed inside table rows only | rows only | rows only | banned | banned | n/a | n/a | rows only | U, T, H |
| C15 | Stack | DaisyUI v5 + Tailwind 4, custom theme. shadcn-based sources are value references only | same | same | DaisyUI for mobile web; native uses platform controls | same | same | same | same | Danny's stack rule |

## Other defaults this skill set

Marked `[D]` where they appear.

| Default | Value | Where |
| --- | --- | --- |
| Grade thresholds | heavy 8+ tells or 3+ groups; light 1 to 7 tells in at most 2 groups | SKILL.md step 6 |
| App size limit | 6 distinct sizes or fewer | review-checklist.md |
| Accent share check | 5% of the screen or less (sources say about 3%) | passes.md pass 2 |
| Background color and radius targets | 5 or fewer, 4 or fewer | review-checklist.md |
| Durations | 150 / 200 / 400 ms | motion.md |
| Accent hex | light #2563eb, dark #60a5fa until the World line picks one | astryx.md |
| Info and dark warning hex | #4b5565 / #a3a9b8, #e0a84a | astryx.md |
| Settings rows | 44 to 56 tall | surfaces.md |
| Off-grid mobile values | snap to the grid (14 to 12 or 16, 27 to 28) | tokens.md |
