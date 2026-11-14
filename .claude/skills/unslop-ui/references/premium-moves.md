# Premium moves

Removing tells gets a screen to "tidy but anonymous" (taste-skill scores that a 6 of 10). These moves are what the designers in the before/after posts added on top. Use 1 to 3 per screen (designed states, #29, are owed on every app screen and do not count toward the 3), chosen by the direction's Moments and Signature lines. Never all of them.

Each move: what it is, the values seen, the surface, the source.

| # | Move | Values | Surfaces | Source |
| --- | --- | --- | --- | --- |
| 1 | Near-black, not black | Ground #09090B; card #131316 | Mobile, dark apps | V-B4, V-A1 |
| 2 | One glow point, not glow everywhere | A single accent glow on the current data point or hero object; everything else flat | Mobile, dashboard | V-A1, V-B4 |
| 3 | One named signal accent | Replace a gradient with one accent ("gradient -> signal red") on a dark card set over an off-white dot-grid ground | Mobile, dashboard | V-B3 |
| 4 | Big figure as the moment | Hero number 68/200 Geist, or a dot-matrix numeral with 7px dots, `tabular-nums` | Mobile, dashboard | V-B3, V-B4 |
| 5 | Rolling numbers | Digits roll on change (numericText / per-digit tween) 200 to 400ms | Mobile, dashboard | V-A1, V-A3 |
| 6 | Real photos over initials | Avatars as photos, overlapping group ("Your circle") | Mobile, web app | V-A5 |
| 7 | One rich illustration from the world | Textured scene tied to the product (Fuji and Shinkansen for a train app; 3D character for fitness; pixel-art paper plane for invoices). One per screen | Mobile, landing | V-B1, V-A8, V-C2 |
| 8 | Product preview as hero | Coded card with plausible data: status tags "Paid $4,200", "Sorted", period "October 2026" | Landing | V-C2, U |
| 9 | Pill CTA with state | Dark pill plus a small live state ("Start run" with "GPS READY") | Mobile | V-B4 |
| 10 | Dotted line chart | Dotted or spline line, muted grid, glowing current point, units on axis | Dashboard, mobile | V-B4, V-A4, I |
| 11 | Dot-matrix chart | Bars drawn as dot columns with a muted grid | Dashboard | I (Fulcrum) |
| 12 | Monochrome area chart | Area under one line in neutral steps; accent only on the latest value | Dashboard | V-B2 |
| 13 | Chart with a takeaway | A bold one-line finding above the chart; red over-budget tag ("£16.50 over") | Dashboard | V-C1 |
| 14 | Context line on stats | "in the last 30 days" plus a second KPI in the same card | Dashboard | I (Fulcrum) |
| 15 | Tinted status pills | Pale tint plus dark same-hue text, 20 high, radius 6, optional leading dot | Dashboard, web app | I (marcelkargul), R, V-A2 |
| 16 | Tabular telemetry | Mono or tabular figures so live numbers never jitter | Dashboard, web app | V-C6 |
| 17 | Keycaps and quiet counts | Shortcuts as keycaps; counts as muted mono text | Web app | U |
| 18 | Light canvas for builders | Node editors: light canvas, white cards, grey hairline borders, thin grey bezier edges, vertical run timeline with status dots | Web app | V-C7 |
| 19 | Designed run states | Queue cards slide Waiting -> Workers -> Done; Pause greys and freezes; button morphs Pause/Resume | Web app (agent UI) | V-C3 |
| 20 | Hover tooltip with real fields | Duration, cost, input, output; no delay | Web app, dashboard | V-C4 |
| 21 | Hold-to-confirm | Linear fill while held; snaps back on early release | Web app, mobile | V-C5 |
| 22 | Selection that glides | One highlight moves between list items or radio cards instead of each item lighting up | Web app, settings | F, V-C5 |
| 23 | Optical weight swap | Label weight 400 -> 550 with an invisible bold copy reserving width, so nothing shifts | Web app | F |
| 24 | Glass only on system chrome | iOS 26 tab bar, search, toolbar at 7% fill (10% raised) over content (defaults C3) | Mobile (iOS) | V-B4, V-A6, S |
| 25 | Off-white primary on dark | Primary button off-white #ededed with dark text; accent saved for selection | Dark app, mobile | U, I |
| 26 | The finding first | One sentence under the title with today's fact and its action ("3 invoices are over 30 days late, $8,420. Send reminders") | Dashboard, web app | T, RW |
| 27 | Annotated spike | The chart names the real event at its spike ("401(k) rollover +$38,400.00") | Dashboard | RW, T |
| 28 | Facts with units and times | Hype to specifics: "Arriving at 7:42 pm, in 12 minutes, about 1.4 km away"; "Tue, Oct 21, 6:48 am, along the river"; "5:12 /km" | All | RW |
| 29 | Designed states | Loading as flat bars at real size; empty keeps its frame and one sentence; error in the block with last-good time and Retry; first run puts the first action where data will appear | App surfaces | T, H |
| 30 | Show what a setting produces | A live preview beside the control (theme, email, invoice) | Settings | T |
| 31 | Product face | Ground tinted from the World, a figure face with character, or the brand hue on the main data element | App surfaces | T |
| 32 | Trace legend with fill patterns | Stripes thinking, solid tool call, outline waiting; one color per model; "SLOWEST" tag on the outlier | Agent tool | RW |
| 33 | Run summary line | "5 agents • 26.4s • 1.5x faster than sequential • $0.16" | Agent tool | RW |
| 34 | In-place confirmation | The button morphs to a check instead of a toast; toast only when context changes | Web app, settings | RW, V-C5 |
| 35 | Serif for the user's content | A serif display (New York Medium 29) for what the user said or saved, against sans chrome | Mobile, assistant panels | RW, V-A7 |
| 36 | One live thing (pages) | One thing the visitor can do on the page: a working calculator, a real search, a draggable preview | Landing | T |

## How to pick

1. Read the Moments line. Pick the move that renders it (a chart move for a dashboard, a figure move for a fitness app).
2. Read the Signature line. Pick at most one move that carries it (keycaps for a dev tool, a route line for travel).
3. Skip moves that bring a new trend the product does not need (glass on cards, grain, bento).
4. Re-run the name-swap test. A good move makes the screen fail to fit a competitor.
