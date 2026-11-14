# What is in `.claude/`

How an agent is set up to work in this repository. `AGENTS.md` at the root is the short version
every agent reads first; this folder holds what backs it.

| Path | What it does |
| --- | --- |
| `settings.json` | Hooks, permissions, plugins and which servers in `.mcp.json` are off |
| `hooks/session-start.mjs` | Installs dependencies, creates local settings, applies local migrations, links the design engine, says where the product stands |
| `hooks/guard.mjs` | Refuses writing secret or generated files, deploys that skip the deploy script, changes to a remote database, pushes and pull requests to someone else's repository |
| `hooks/format.mjs` | Formats each file after it is edited |
| `hooks/stop-check.mjs` | Types and repo-wide tests before the agent stops; a failure sends it back once |
| `rules/*.md` | Rules that load only when a matching file is touched, one file per area: web pages, design work, the database, sign-in and access, each optional part |
| `skills/` | Skills written for this template, and ones copied in (`skills/VENDORED.md` says from where, at which commit, and what was changed) |
| `agents/reviewer.md` | Reviews a finished change in a fresh context |
| `agents/impeccable-*.md` | Helpers the `impeccable` skill starts by itself (copied in with it) |
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
| `impeccable` | Plan, review and finish a screen: `shape`, `critique`, `audit`, `polish`, `harden` and more (copied in) |
| `unslop-ui` | Audit and fix a web screen that looks generated (copied in; see `skills/VENDORED.md`) |
| `appllama-*` | The build bar for mobile screens (copied in) |

`.mcp.json` at the root lists documentation servers for the stack: Astryx, Better Auth and
Cloudflare.
For the mobile app it lists Expo's, and Appllama's, which stays off until its account is set up.
Each asks for approval the first time it is used.

## Impeccable

The design skill from [impeccable.style](https://impeccable.style), copied in at one version with
its engine pinned to match. `rules/design.md` is the short account of how it is fitted here.

- **It runs a program.** The skill's commands go through `skills/impeccable/scripts/impeccable` to
  a native engine. npm installs that engine (`impeccable` in the root `package.json`, pinned by the
  lockfile). At the start of a Claude Code session the hook checks it against the skill's own
  checksum for it and links it next to the launcher, so nothing is downloaded. Where there is no
  link (another agent, Windows without symlinks, `node_modules` installed after the session
  began), the launcher downloads the same engine from GitHub and checks it the same way.
- **It checks pages as they are edited.** Two hooks in `settings.json` run the engine after an
  edit to a page and once when the agent stops. They report; they never block an edit. Turn them
  off for a project with `/impeccable hooks off`.
- **It sends nothing.** `.impeccable/config.json` turns off its usage reports and update checks.
  One thing still reaches impeccable.style: asking it for a new visual direction (a redesign
  through its own workshop), which this template does not use, since the look is `brand.ts`.
- **It starts no agent of its own.** Its live mode can start a second coding agent with
  permission checks off when no chat is listening. `settings.json` sets
  `IMPECCABLE_LIVE_COPY_AGENT=chat`, which forbids that in every session Claude Code starts; set
  the same variable yourself before running `npx impeccable live` from your own terminal. Inside
  a session, live mode, `install`, `update` and `login` always ask first.
- **What it reads is generated**: `PRODUCT.md` from the brief, `DESIGN.md` from the brand
  (`npm run design:context`).

## What to know before relying on it

- **Plugins cannot be pinned to a commit.** `settings.json` turns on skills from Cloudflare, from
  Better Auth and from Claude Code's official directory (`enabledPlugins` names each one). Claude
  Code pins a marketplace to a branch or a tag only, and neither vendor publishes tags, so these
  follow each vendor's `main`. Claude Code asks before installing them when the folder is first
  trusted. To run without one, set it to `false` under `enabledPlugins`.
- **Plugins do not load in cloud sessions** (claude.ai/code). The hooks, rules, skills and the
  reviewer in this folder do, so nothing the template depends on comes from a plugin.
- **Hooks and permission rules do not apply in a cloud thread that belongs to a claude.ai
  project.** There, `npm run check` is the safety net: run it before finishing.
- **The guard is a backstop, not the rule.** It matches commands as text and can be worded
  around. The rules themselves are in `AGENTS.md`, and the deploy script makes its own checks.
