# Pre-work

Do all of this before the first edit. It is what turns a "correct" but thin screen into one with substance. Removal alone loses: a sparse screen with nothing to say looks worse than a busy one in blind tests [T]. Tags point to [sources.md](sources.md).

## 1. Look and record the before

- Render the real screen and screenshot it. Judge pixels, not code [U, T, H].
- Widths: 1440 and 768 for web, 390 for phones, 1280x800 for a marketing fold [T, H].
- Run [../scripts/measure.js](../scripts/measure.js) and save the output as the before numbers [T, I].

## 2. Record the wiring

List what must survive the redesign, by file and line [H]:

- Links and routes: `rg -n -e 'href=' -e 'to=' -e 'router.push' -e 'router.replace' <files>`
- Forms and fields: every `name=`, `id=`, `for=`
- Handlers: `rg -n -e 'onClick' -e 'onSubmit' -e 'onChange' -e '@click' -e 'action=' <files>`
- Test ids: `rg -n -e 'data-testid' -e 'data-test=' -e 'data-cy' <files>`
- Content: every section, block and data field the screen shows

Save the list. The independent check diffs against it [H].

## 3. Data inventory (app screens)

Write down, from the code and the brief [T]:

- **Objects and fields**, with units and realistic magnitudes (invoices: amount in USD, 40 to 12,000; due date; status of 4).
- **Who opens the screen and how often** (a finance lead, every morning).
- **The jobs** they do here, most frequent first.
- **The product's own things**: name, mark, workspace names, people, recognisable objects.

For pages, list 8 to 12 things that belong to this subject and to no competitor: names, places, numbers, constraints, materials, rituals, printed artefacts [T].

## 4. The one question and the finding (app screens)

- **Question**: the one thing this screen answers, in the user's words ("Which deploy broke?", "Who has not paid?"). The biggest block on the screen answers it [T].
- **Finding**: the fact in today's data that needs attention. Put it as one sentence under the title, next to the action it drives ("3 invoices are over 30 days late, $8,420 in total. Send reminders") [T, RW].
- **Frequent job**: the most frequent job is one click from the first screen [T].
- **First screen**: every block the brief names shows its header and first rows at 1440x900 [T].

## 5. Sample data that adds up

- Write the sample data as one file (`sample-data.ts` or `.json`), not inline literals.
- Compute every total from the rows. Never type a total by hand.
- Add an assertion that the shown figures agree (sum of rows = total, segments = 100%, counts match list length).
- A fact shown twice is one variable, so both places change together [T].
- Use plausible names, amounts with units and real dates. Never invent customer logos, testimonials or metrics for a real product [U, H].

## 6. Direction

The five lines in SKILL.md step 9. Derive them from items 3 and 4, never from trends [U]. Pages add an idea sentence: "On this page, [thing from the subject] becomes [device]", with a competitor test, and one live thing the visitor can do [T].

## 7. Reference apps

Ask the user for 3 to 5 real apps that fit the use case, or propose them and ask [X:jaimintf]. For each, write what you take:

| App | Structure to borrow | Not borrowed |
| --- | --- | --- |
| e.g. Linear | list with inline status, keyboard-first actions | its purple, its type |

Rules:
- Copy structure (information order, grouping, density, navigation), never the look (color, type, illustration) [X:jaimintf, U].
- Take qualities (composition, light, restraint), never subject or layout of a known screen. Judges spot copies [U, T, X:roadsteralex].
- If the project has a design system or component library, load it and edit its components instead of writing new ones [X:seanaiux, RW].
- After borrowing, the Signature and product face are still owed ([defaults.md](defaults.md) C12).
