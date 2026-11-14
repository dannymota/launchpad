# Skills copied in from elsewhere

Each was read in full before it was copied. They are Markdown guidance only: no scripts, no
commands that run on their own, nothing that sends data anywhere.

| Skill                       | Source                              | Commit                                     | Licence | Copied     |
| --------------------------- | ----------------------------------- | ------------------------------------------ | ------- | ---------- |
| `appllama-app-design-skill` | github.com/Appllama/appllama-skills | `dd5caaec3d5d50ad7fc0324da238119c6b7c3707` | MIT     | 2026-11-13 |
| `appllama-usage`            | github.com/Appllama/appllama-skills | `dd5caaec3d5d50ad7fc0324da238119c6b7c3707` | MIT     | 2026-11-13 |

Not copied: the repository's plugin manifests and its `agents/openai.yaml`.

`appllama-usage` only does anything when the Appllama MCP server is connected, which needs a paid
Appllama account. Without it, skip the research step it describes and build to the design skill.

To update: read the new version's diff in full, copy the folders again, and change the commit above.
Where this template's own rules differ, `.claude/rules/mobile.md` wins.
