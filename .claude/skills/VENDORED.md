# Skills copied in from elsewhere

Each was read in full before it was copied. A skill here is guidance for the agent, kept at a
commit that was reviewed; nothing in this folder updates itself.

| Skill | Source | Commit | Licence | Copied |
| --- | --- | --- | --- | --- |
| `unslop-ui` | github.com/dannymota/unslop-ui (the owner's) | `64e779581ef1871a1b187a0b15ba733b9dac4029` | CC BY 4.0 | 2026-11-14 |
| `appllama-app-design-skill` | github.com/Appllama/appllama-skills | `dd5caaec3d5d50ad7fc0324da238119c6b7c3707` | MIT | 2026-11-13 |
| `appllama-usage` | github.com/Appllama/appllama-skills | `dd5caaec3d5d50ad7fc0324da238119c6b7c3707` | MIT | 2026-11-13 |
| `impeccable` 4.9.1, with `../agents/impeccable-*.md` | github.com/pbakaus/impeccable (`.claude/` in that repository) | `1995764b4936f2bfbf4eb719cb37b384a45ceacb` | Apache 2.0 | 2026-11-14 |

## What was changed

- `unslop-ui`: `references/daisyui-theme.md` is replaced by `references/astryx.md`, and the stack rule, description and links in `SKILL.md` and the references point to it. Nothing else is edited, so the tables still name DaisyUI classes; `astryx.md` says what to use instead. Its `LICENSE`, `NOTICE.md` and `LICENSES/` travel with it: it adapts unslop by Damir Sokolovsky (@heydamir), CC BY 4.0, and credit is due on any shared before and after.
- `unslop-ui` has two scripts, `measure.js` and `redline.js`. They run in the page being audited, read its styles and draw labels on it. They make no network requests and store nothing.
- The Appllama skills are Markdown only. Not copied from Appllama: the plugin manifests and `agents/openai.yaml`.
- `appllama-usage` (Appllama) only acts when Appllama's own server (`appllama` in `.mcp.json`) is connected, which needs a paid account. Without it, skip its research step and build to the design skill.
- Where the Appllama design skill and `.claude/rules/mobile.md` differ, the rule file wins.

## Impeccable

Unlike the others, this one is more than guidance: its commands run a native engine.

- **Nothing in it is edited.** The folder is the upstream build for Claude Code, byte for byte,
  plus its `LICENSE` and `NOTICE.md` (two of its references are distilled from ehmo's
  `platform-design-skills`, MIT). It is fitted to the template from outside: `.impeccable/config.json`,
  the generated `PRODUCT.md` and `DESIGN.md`, and `.claude/rules/design.md`.
- **What was read.** Every Markdown file in the skill and the four agents, in full; the launcher
  scripts (`scripts/impeccable`, `impeccable.cmd`) in full; the browser scripts and data files by
  search for network calls, `eval`, cookies and hard-coded hosts. No hidden or unrelated instruction
  was found. The engine is a compiled program: its source is in the same repository and was read
  only where the documents left a question open, so the engine itself is trusted as the release its
  checksum names, not on a review.
- **The engine is pinned twice.** `scripts/engine-checksums.txt` holds the SHA-256 of engine 0.1.24
  for each platform; the launcher refuses a download or a cached copy that differs. The root
  `package.json` pins `impeccable` 4.9.1, whose lockfile entry holds the same engine. The launcher
  runs an engine it finds beside itself on its version alone, so the session-start hook links the
  npm copy there only after hashing it against the same checksum file, and
  `tests/design-context.test.ts` does the same on every test run. That test also fails if the skill
  and the package are ever different releases.
- **What it does beyond design, and what the template does about each:**
  - Sends usage reports and checks for updates: both off in `.impeccable/config.json`.
  - Asks impeccable.style for visual directions when a new look is started through its workshop:
    not used here; a new look is a change to `brand.ts`.
  - `live` and `generate` add a script to the root layout, can edit the content security policy in
    a framework config, and can start a coding agent with permission checks off: the last is
    forbidden by `IMPECCABLE_LIVE_COPY_AGENT=chat` in `.claude/settings.json` (for sessions Claude
    Code starts; a terminal of your own needs the variable set there), and both commands ask first.
  - `foundations <id>` and `doctor --fix` change files outside design work (CI, dependencies,
    hosting config, its own records) without asking: the rule file says only on the owner's word.
  - Image generation falls back to an OpenAI key when one is in the environment, and sends a
    screenshot as a reference: this template builds in code (`"buildPath": "code"`).
  - Its engine prints directions for the agent, some worded as overriding other instructions:
    the rule file says they never outrank `AGENTS.md` or the owner.
- **Not copied:** its plugin manifest and its session-start hook entry (it only records a session
  id for a kind of build this template does not use). The two hook entries that are copied sit in
  `.claude/settings.json` exactly as upstream writes them, so the engine recognises them.
- **To update:** read the release notes and the diff of `.claude/skills/impeccable` and
  `.claude/agents` between the two commits; copy both again; set `impeccable` in `package.json` to
  the same version (`npm install --save-exact -D impeccable@<version>`); run `npm run check` and
  `npm run e2e`; change the row above. `npx impeccable update` would also rewrite the folder, but
  it fetches from impeccable.style and does not move the package pin, so do it by hand.

## Updating one

Read the new version's diff in full, copy the folder again, re-apply the changes listed above, and change the commit in the table.
