# Astryx mapping (this repository)

This copy of the skill runs on Astryx, not DaisyUI. The other reference files still name
DaisyUI classes in their tables: read those columns as "what the fix is", and take the
component, prop or token from this file. Where the two disagree, this file wins.

Rules:

- **The brand is one file**: `packages/theme/src/brand.ts`. A colour, radius or typeface
  changes there, then `npm run theme` rebuilds the web theme and the generated values. Never
  set a colour or radius in a page. There is no `data-theme` and no theme block to install:
  skip those steps in passes.md and tells.md (COL-12 does not apply).
- **Components before utilities.** Layout and spacing come from component props
  (`gap={4}`, `padding={6}`). A Tailwind utility is allowed only when it is backed by a
  token. No `<div>`, no `style={{}}`, no raw hex, no arbitrary values (`p-[13px]`).
- **Read before you use.** `npx astryx component <Name>` prints a component's props;
  `npx astryx search "<words>"` finds one; `npx astryx docs tokens/<name>` lists tokens.
  Run them from `apps/web`. Do not guess a prop.
- **Start from a template** for a new page (`npx astryx build "<idea>"`), and keep its frame,
  gap and padding. An audit changes what is inside the frame.
- **Finish with** `npm run doctor -w @app/web` and `npm run check`. Contrast for the brand is
  tested in `packages/theme/tests/theme.test.ts`: a new colour pair goes there.

## 1. Where the skill's values live

| Skill value | In this repository |
| --- | --- |
| Ramp (graphite, warm, ink) and accent | `brand.ts` colours, as `[light, dark]` pairs. The palette comes from one seed in `packages/theme/palette.config.json` |
| Three text roles | `Text color="primary"`, `"secondary"`, `"placeholder"` (muted meta). Never opacity steps |
| Radii: selector 6, field 8, box 16 | `brand.ts` `radius`. Components take their radius from the theme; do not set one |
| One family plus one partner | `brand.ts` `font`; the web loads it in `apps/web/src/themes/brand/brand.fonts.css` |
| About 5 sizes, weights 400 and 500 | `Text type`: `body`, `large`, `label`, `supporting`, `code`, `display-1` to `display-3`; `Heading level`. Pick a type, not a size |
| 4px spacing grid | Spacing steps `0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10` on `gap` and `padding` props (a step is 4px) |
| Control heights 32 / 40 / 48 | `size="sm"`, `"md"`, `"lg"` on Button and the inputs |
| Depth from surface steps, not shadow | Leave elevation at the component default; `Card` and `Layout` set their own surface |
| Motion: one easing, token durations | The theme's motion tokens. Do not write a duration or a curve in a page |
| Dark mode | Every token is a light and dark pair already. Never branch on the scheme in a page |

## 2. Fix to component map

| Fix | Astryx |
| --- | --- |
| Page frame, header, scrolling content | `Layout`, `LayoutHeader`, `LayoutContent` |
| Stack, row, grid, spacer | `VStack`, `HStack`, `Grid`, `StackItem size="fill"` |
| App shell with sidebar | `AppShell`; `Breadcrumbs` for depth |
| Card (only for things with their own boundary) | `Card`; `ClickableCard` when the whole card is the action |
| Dense rows | `Table`, or `List` with `ListItem`. Not a list wrapped in cards |
| Divider between groups | `Divider`; `List hasDividers` |
| Primary action (once per view) | `Button variant="primary"` |
| Secondary action | `Button` (default) or `variant="ghost"` |
| Destructive action | `Button variant="destructive"`, confirmed with `AlertDialog` |
| Status pill (tint, dark text) | `Token`. `Badge` is for counts only |
| Live status dot (only if live) | `StatusDot`; `AvatarStatusDot` on a person |
| Keyboard shortcut | `Kbd` |
| Tabs | `TabList` with `Tab`; `SegmentedControl` for a two-to-four way switch |
| Form field | `TextInput`, `TextArea`, `Selector`, `MultiSelector`, `CheckboxList`. Label always present; `status` for validation |
| Message that stays until acted on | `Banner` |
| Brief confirmation | `useToast()` |
| Menu / popover / hint | `DropdownMenu`, `Popover`, `Tooltip`, `InfoTip` |
| Dialog | `Dialog`; `AlertDialog` for a decision; `BottomSheet` on a phone |
| Empty state | `EmptyState`, with the one action that fills it |
| Loading in a button | the button's `isLoading` or `clickAction` |
| Block loading | Flat bars at the real size of each line (states.md). Check `Skeleton` in the browser first: if it animates a sweep, do not use it |
| Progress / steps | `ProgressBar`; `Stepper` with `Step` |
| Avatar | `Avatar`, `AvatarGroup`, with real photos or initials |
| Icon | `Icon` with one set (`@heroicons/react/24/outline`), one size. No emoji |
| Chat and assistant screens | `ChatMessageList`, `ChatMessage`, `ChatMessageBubble`, `ChatComposer`, `ChatToolCalls` |
| Figures | `Text` with tabular numbers; right-align figure columns in `Table` |
| Focus ring | Built in. A custom control uses the focus tokens (`npx astryx docs tokens/tokens-focus`) |

## 3. What reads as slop here

| Do not | Why |
| --- | --- |
| A second `variant="primary"` in one view | One accent (COL-07) |
| `Card` around every section, or cards inside cards | Boxes instead of hierarchy. Spacing and a heading group things |
| `Badge` as a status label | It is a counter; use `Token` |
| A colour, radius or font size written in a page | It leaves the brand (COL-13) |
| `Spinner` for a whole page or block | Decorative loader; use flat bars at the content's size |
| A display type for anything but the one headline | Type scale flattens |
| An Astryx template shipped with its sample content | Template look: the frame stays, every word and number becomes the product's |

## 4. Measuring

`scripts/measure.js` and `scripts/redline.js` read the rendered page, so they work unchanged.
Run the built Worker (`npm run build`, then `npm start -w @app/web`) and measure that, not the
dev server: it is what ships. Astryx class names are generated, so the "arbitrary value" count
in measure.js looks at Tailwind classes only; check for raw values in the source with
`npm run doctor -w @app/web`.

## 5. Mobile

The iOS and Android app does not use Astryx. Its screens follow
`.claude/rules/mobile.md` and take colours and radii from the same brand through
`useTheme()`. Use this skill's mobile tables for what to fix there, and that file for how.
