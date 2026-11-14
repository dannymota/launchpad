---
paths:
  - "apps/web/app/**"
  - "apps/web/lib/**"
---

# Web pages (Astryx)

Run every `astryx` command from `apps/web`, as `npx astryx <cmd>`.

- **Start a page from a template, never from scratch.** `npx astryx build "<idea>"` names the
  template; `npx astryx template <name> --type page <path>` scaffolds it. Keep its frame, gap and
  padding; replace the content. Changing a page that exists? Keep it, and add blocks inside it.
- **Read a component's props before using it**: `npx astryx component <Name>`. Find one with
  `npx astryx search "<words>"`. Do not guess a prop.
- **No `<div>` or `<span>`, no `style={{}}`, no raw hex or px, no arbitrary values** (`p-[13px]`).
  Layout and spacing come from component props; a Tailwind utility is allowed only when a token
  backs it.
- **Dense data is rows** (`Table`, `List` with `ListItem`), not a list wrapped in cards. `Badge` is
  for counts; a status label is a `Token`.
- **Colours and radii come from the brand** (`packages/theme/src/brand.ts`, then `npm run theme`).
  Never set one in a page.
- **Pages are server components.** They get the person with `requireUser()` or `pagePrincipal()` and
  data with `api()`, all from `@/lib/server`. A client component (`"use client"`) calls
  `browserApi()` from `@/lib/api-client`. Never import `@/lib/server` from a client component.
- **A text field on a server-rendered page takes `useEarlyInput`** (`@/lib/early-input`): it can be
  typed into before the page's code runs, and without the hook that text never reaches the state.
- **Where a page lives decides who can open it**: `(site)/` is the public website, `(app)/app/` the
  signed-in product, `(account)/` sign-in and settings, `admin/` and `labs/` internal in every
  preset. Unfinished work goes under `labs/`.
- **Before you finish**: `npm run doctor -w @app/web` on a built app, then `npm run check`. For a
  screen people will judge by eye, run the `unslop-ui` skill on it.
