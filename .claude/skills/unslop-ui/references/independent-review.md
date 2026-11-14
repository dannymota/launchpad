# Independent check

The builder grades its own work too kindly. After the self-check, hand the result to a reviewer with a fresh context: a second agent or subagent that did not build it and has not read your notes [H]. Tags point to [sources.md](sources.md).

## 1. What the reviewer gets

- The before and after screenshots at the same widths (1440 and 390; 1280x800 for a landing fold).
- The surface name and the five-line direction.
- Nothing else: not the diff, not your reasoning, not this skill's pass notes [H].

On a polish (light grade), send only the full screens at 1440, before and after, and ask one thing: does anything still read as machine-made? At most five findings [H].

## 2. The reviewer brief (paste as is)

```
You did not build this. Compare BEFORE and AFTER.
1. Seen in one second: what is this screen, and what does it want me to do?
2. What did the old one do better? Name anything a user could do, read or find
   before that is harder now. If nothing, say "nothing".
3. Score AFTER, 1 to 10 each: design, usability, creativity, content.
   overall = 0.4*design + 0.3*usability + 0.2*creativity + 0.1*content.
   Apply the caps below; they override the arithmetic. List the caps applied.
4. Top three problems, most visible first. Each: where (screenshot, region),
   what you measured or saw, one fix. "Could be more polished" is not a finding.
5. First word of your answer: ship, fix, or rebuild.
```

## 3. Scores and caps

Weights: design 40, usability 30, creativity 20, content 10 [T]. A real, strong result lands around 7.5 to 8. An honest 8.5 is rare. If the builder's own first score is 9, score again as a stranger [T].

Caps (they override the sum):

| Condition | Cap | Source |
| --- | --- | --- |
| Any tell from [tells.md](tells.md) still visible | overall 6.5 | T, adapted |
| Eyebrow or tracked uppercase label, decorative gradient, shadow on a resting element | overall 6.5 | T |
| A data block without loading, empty or error state | usability 6 | T, adapted [D for the number] |
| Any placeholder (grey box, lorem, "Image here", "User Name") | content 5 | T |
| The screen could belong to a competitor (name-swap fails) | creativity 6 | T, U |
| The question of the screen is not answered by its biggest block (app screens) | usability 6 | T, adapted [D for the number] |
| No visible primary action on the first screen | usability 7 | T |
| Figures that do not add up | content 5 | T, adapted [D for the number] |
| Content clipped or overlapping in a stress test | usability 5 | T, X:eclarkhalid |
| Landing: fewer than 4 real pictures (drawings do not count) | design 6.5 | T |
| Landing: no live thing the visitor can do | creativity 7.5 | T |

## 4. Preservation check (the builder runs it)

Diff against the wiring list from [prework.md](prework.md) section 2:

```
Kept   14/14 links · 5/5 fields · 9/9 handlers · 6/6 test ids · 11/11 blocks
```

- Anything missing is a fail. Restore it, or write why it was dropped and who agreed [H].
- Run the project's type check, build and tests. A redesign that breaks one is not done [H].
- Content stays: features, data and section order. Never ask for copy or a visual the old screen did not have; send that to the user as a question [H, U].

## 5. Evidence rule for findings

Every finding, from the builder or the reviewer, passes this gate before it goes in the report [F]:

1. **Evidence**: a measured value with route and width (from measure.js or DevTools), or a `file:line`. A hunch or a grep hit is a lead to measure, not evidence.
2. **Reach**: the evidence is on a screen people use, not a demo or a story file.
3. **One fix**: the finding names exactly one change (a token, a class, a component). If it needs product intent nobody stated, it is a question for the user.

Then try to break each finding: reopen what it cites and delete it if the value or file does not match, or the difference is a recorded decision [F].

## 6. Rounds

Run at most 3 rounds: review, fix the top three, re-render, review [T, U]. Stop early when a round finds nothing a stranger would notice. If round 3 still scores under 7.5, say so plainly and list what is left. Do not round up [T].

Light grade: the reviewer's defects (misalignment, a broken glyph, a label that lies) are fixed at any depth; a finding that asks for a new composition goes to the user as a suggestion [H].
