# States and stress tests

A screen is not done until every data block has its states and the layout survives hostile content. Run this in pass 7 (Details and states). Tags point to [sources.md](sources.md).

## Data states (every data block)

| State | When | Do | Do not | DaisyUI v5 / Tailwind |
| --- | --- | --- | --- | --- |
| Loading | first fetch | Flat grey bars at the real size and position of the content they replace: same row count, same line heights, same widths per column. No layout shift when data lands [T, H] | shimmer, pulse, a lone spinner for a block, a smaller box than the content | `<div class="h-3 w-24 rounded-field bg-base-300">` per text line. Do not use `skeleton`: it animates a shimmer in DaisyUI 5 (measured) |
| Empty | no records yet, filters on | Keep the block's frame and header. One sentence in muted text that says what will appear, plus one action if there is one ("No invoices match these filters. Clear filters") [T, H] | illustration plus three buttons, the block removed | `text-ink-3`, `btn btn-sm btn-ghost` |
| Zero | the value is 0 | Print zero as zero ("0", "$0.00"). Zero is data [T] | a dash, "N/A", or hiding the row | `tabular-nums` |
| Missing value | field not set | A grey dash at the text size of the row [T] | a 24px "--" | `text-ink-3` |
| Error | the fetch failed | Inside the block, not a page toast: what failed in plain words, the last good time, and Retry ("Could not load payments. Last updated 9:41. Retry") [T, RW] | a red full-page banner, a stack trace, "Something went wrong!" | `alert alert-soft alert-error` inside the card, `btn btn-sm` |
| First run | a new account | Put the first action where the data will appear, in the block's frame ("Connect a bank account to see payments here") [T, H] | an empty dashboard of zeros, a modal tour | `btn btn-primary btn-sm` inside the card |
| Stale | data older than its refresh window | A muted "Updated 12 min ago" next to the block title, plus a refresh action. Live data shows a small live dot [T, RW] | silent old numbers, a pulsing dot on static data | `status status-success` for live; `text-ink-3` for the time |
| Partial | some rows failed | Show what loaded, then one row that says what is missing ("2 accounts could not sync. Retry") [D] | dropping the block | `list-row`, `text-ink-3` |

Agent tools add queue states: waiting, running, done, failed, with the attempt count ("Attempt 1 of 3") and "Nothing waiting" in muted text when the queue is empty [RW]. See [surfaces.md](surfaces.md) section 7.

## Control states (every interactive control)

Default, hover, focus-visible, active (pressed), selected, disabled, loading, error [H, U].

- Hover: one surface step or the overlay values in [tokens.md](tokens.md) (+6% / +10% dark, 4% / 7% light) [F].
- Focus-visible: a visible ring on every control [H]; 2px in the accent, offset 2px [D]. Never remove outlines without a replacement.
- Disabled: still readable, and says why (a tooltip or helper text: "Add a payment method first") [T].
- Loading: the control keeps its width; a small spinner replaces or sits beside the label [U]. `btn` with `loading loading-spinner loading-sm`.
- Error: the message in the helper slot, 4px under the input, in plain words [V-C8, H]. `input-error`, `validator`, `validator-hint`.
- Confirmation: morph the control in place (copy to check, Save to "Saved") instead of a toast where you can [RW, V-C5].

## Stress tests (run after pass 7, and again in the proof)

| Test | How | Pass when |
| --- | --- | --- |
| Long name | Replace one name with 40 or more characters ("Northstar Clinics International Holdings LLC") and one email with 50 | Text wraps or truncates with an ellipsis and a full-text `title` or tooltip; nothing overlaps; row heights stay equal [X:eclarkhalid, T] |
| Large text | Browser zoom 200%; iOS Dynamic Type at the largest accessibility size; Android font scale 2.0 | No clipped text, no overlap, actions still reachable; rows grow instead of cutting [X:eclarkhalid, D] |
| Two-line preview | Put a two-line message or description in one list row | The row grows or clamps to 2 lines (`line-clamp-2`); neighbours stay aligned [X:eclarkhalid] |
| Big numbers | Put the largest plausible value in each figure ($1,284,930.55; 12,480 rows) | Figures do not wrap or collide; tabular columns stay aligned [T] |
| Many rows | 0, 1 and 500 rows | 0 shows the empty state; 1 does not look broken; 500 scrolls inside the block or paginates [T, D] |
| Narrow | 390 wide | Nav folds, tables become 2-line rows, nothing scrolls sideways except a table you chose to scroll [T] |
| Ragged grid | Look at the bottom edge of every card row | Rows end level; spans add up to the grid [T] |

Record each test as pass or fail in the report, with a crop for any fail you could not fix.
