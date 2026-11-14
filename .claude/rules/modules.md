---
paths:
  - "packages/backend/src/modules/**"
  - "scripts/removable.mjs"
  - "scripts/remove.mjs"
---

# Optional modules, and keeping things removable

A module (payments, AI, analytics) is a folder here that registers itself in `modules/index.ts`.
The core asks the registry what modules add and never imports one by name.

- **Off until configured.** `on(env)` is true only when the module's settings are present. While it
  is off its routes do not exist, nothing is spent and `/health` reports it as `off`.
- **Everything a module adds outside its folder sits between markers**, so `npm run remove` can cut
  it: `// >>> name` and `// <<< name` (in JSX `{/* >>> name */}`, in `.dev.vars.example` `# >>> name`).
  Mark whole statements, properties or list items, never part of an expression.
- **Do not split an import or export from one source across markers**: the formatter merges them.
  Put the marker around one line of a multi-line list instead. An import left unused by a cut is
  removed by the script.
- **List the module's own files and packages in `scripts/removable.mjs`.** The same goes for the
  surfaces (`mobile`, `mcp`, `site`).
- **Prove it**: `npm test` checks the list and the markers; `node scripts/check-removal.mjs <name>`
  removes the part on a copy and runs the full check and build. Run it after changing a module.
