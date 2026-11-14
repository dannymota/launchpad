---
paths:
  - "packages/backend/src/modules/**"
  - "scripts/removable.mjs"
  - "scripts/remove.mjs"
---

# Optional modules, and keeping things removable

A module is a folder here that registers itself in `modules/index.ts`. The core asks the registry
what modules add and never imports one by name.

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
- **List the module's own files and packages in `scripts/removable.mjs`** (`paths`, `packageJson`).
  The same goes for a surface, whether it is a folder under `apps/` or pages of the web app.
- **What a document or a comment says about a part goes with it, and that is listed too.** A
  marker would show in prose, so the list names the text instead, per file:
  - `dropLines`: a line is dropped when it contains the text given. Write a sentence, a list item
    or a table row about one part on a line of its own, so the whole line can go and what is left
    still reads well. A sentence may share a paragraph with others; it only needs its own line.
  - `replace`: `[find, replacement]` pairs, for the few places where a sentence must lose some
    words and stay. Every occurrence is replaced, and `find` may span lines.
  - Prefer rewording so that neither is needed: say "`npm run remove` lists them" before naming
    every part in a sentence, and keep two parts out of the same line.
  - `traces`: words that name the part, such as its folder, its command or the service it is
    built on. Once it is removed, no document may still hold one. Each is matched as a whole
    word in its own case, a plural included, so choose words that mean nothing else here.
- **Prove it**: `npm test` holds the list to the repository (every path, package entry and text
  it names exists, each part's texts survive the removal of any other, and after a part's own
  edits its documents hold none of its traces) and checks the markers.
  `node scripts/check-removal.mjs <name>` removes the part on a copy, reads the documents for
  traces, and runs the full check and build. Run it after changing a module.
