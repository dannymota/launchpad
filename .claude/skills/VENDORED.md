# Skills copied in from elsewhere

Each was read in full before it was copied. A skill here is guidance for the agent, kept at a
commit that was reviewed; nothing in this folder updates itself.

| Skill | Source | Commit | Licence | Copied |
| --- | --- | --- | --- | --- |
| `unslop-ui` | github.com/dannymota/unslop-ui (the owner's) | `64e779581ef1871a1b187a0b15ba733b9dac4029` | CC BY 4.0 | 2026-11-14 |
| `appllama-app-design-skill` | github.com/Appllama/appllama-skills | `dd5caaec3d5d50ad7fc0324da238119c6b7c3707` | MIT | 2026-11-13 |
| `appllama-usage` | github.com/Appllama/appllama-skills | `dd5caaec3d5d50ad7fc0324da238119c6b7c3707` | MIT | 2026-11-13 |

## What was changed

- `unslop-ui`: `references/daisyui-theme.md` is replaced by `references/astryx.md`, and the stack rule, description and links in `SKILL.md` and the references point to it. Nothing else is edited, so the tables still name DaisyUI classes; `astryx.md` says what to use instead. Its `LICENSE`, `NOTICE.md` and `LICENSES/` travel with it: it adapts unslop by Damir Sokolovsky (@heydamir), CC BY 4.0, and credit is due on any shared before and after.
- `unslop-ui` has two scripts, `measure.js` and `redline.js`. They run in the page being audited, read its styles and draw labels on it. They make no network requests and store nothing.
- The Appllama skills are Markdown only. Not copied from Appllama: the plugin manifests and `agents/openai.yaml`.
- `appllama-usage` (Appllama) only acts when the Appllama MCP server is connected, which needs a paid account. Without it, skip its research step and build to the design skill.
- Where the Appllama design skill and `.claude/rules/mobile.md` differ, the rule file wins.

## Updating one

Read the new version's diff in full, copy the folder again, re-apply the changes listed above, and change the commit in the table.
