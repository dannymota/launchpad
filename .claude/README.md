# What is in `.claude/`

How an agent is set up to work in this repository. `AGENTS.md` at the root is the short version
every agent reads first; this folder holds what backs it.

| Path | What it does |
| --- | --- |
| `settings.json` | Hooks, permissions, plugins and which MCP servers are off |
| `hooks/session-start.mjs` | Installs dependencies, creates local settings, applies local migrations, says where the product stands |
| `hooks/guard.mjs` | Refuses writing secret or generated files, deploys that skip the deploy script, changes to a remote database, pushes and pull requests to someone else's repository |
| `hooks/format.mjs` | Formats each file after it is edited |
| `hooks/stop-check.mjs` | Types and repo-wide tests before the agent stops; a failure sends it back once |
| `rules/*.md` | Rules that load only when a matching file is touched: web pages, sign-in and access, the database, MCP, mobile, modules |
| `skills/` | Skills written for this template, and ones copied in (`skills/VENDORED.md` says from where, at which commit, and what was changed) |
| `agents/reviewer.md` | Reviews a finished change in a fresh context |
| `launch.json` | Dev servers the desktop app can start and preview |

## Skills

| Skill | Use it to |
| --- | --- |
| `start` | Turn an idea into `product/brief.md` and the product config |
| `brand` | Set colours, corners and typeface from the brief |
| `feature` | Build one feature end to end, from a working scaffold |
| `site` | Write the public website from the brief |
| `listing` | Write the App Store and Google Play listings |
| `ship` | Deploy to staging behind Cloudflare Access |
| `launch-check` | Run every check and list what is left |
| `go-live` | Put the product on its domain and open it |
| `upgrade-template` | Bring a product up to a newer version of the template |
| `unslop-ui` | Audit and fix a web screen that looks generated (copied in; see `skills/VENDORED.md`) |
| `appllama-*` | The build bar for mobile screens (copied in) |

`.mcp.json` at the root lists documentation servers for the stack: Astryx, Better Auth,
Cloudflare and Expo. Each asks for approval the first time it is used.

## What to know before relying on it

- **Plugins cannot be pinned to a commit.** `settings.json` turns on Cloudflare's and Better
  Auth's skills and three from Anthropic's directory (Superpowers, Expo, Stripe). Claude Code
  pins a marketplace to a branch or a tag only, and neither vendor publishes tags, so these
  follow each vendor's `main`. Claude Code asks before installing them when the folder is first
  trusted. To run without one, set it to `false` under `enabledPlugins`.
- **Plugins do not load in cloud sessions** (claude.ai/code). The hooks, rules, skills and the
  reviewer in this folder do, so nothing the template depends on comes from a plugin.
- **Hooks and permission rules do not apply in a cloud thread that belongs to a claude.ai
  project.** There, `npm run check` is the safety net: run it before finishing.
- **The guard is a backstop, not the rule.** It matches commands as text and can be worded
  around. The rules themselves are in `AGENTS.md`, and the deploy script makes its own checks.
