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
- **Never put a marker around an import or a whole `export ... from` line.** The formatter sorts
  those lines and would carry the marker away. There is no need: the script drops every import
  and re-export of a deleted file, and every import a cut leaves unused. Mark the code that uses
  the import instead. The one exception is a single name inside a multi-line export list from a
  file that stays (`packages/backend/src/index.ts` has one).
- **List the module's own files and packages in `scripts/removable.mjs`.** The same goes for the
  surfaces (`mobile`, `mcp`, `site`).
- **Prove it**: `npm test` checks the list and the markers; `node scripts/check-removal.mjs <name>`
  removes the part on a copy and runs the full check and build. Run it after changing a module.
