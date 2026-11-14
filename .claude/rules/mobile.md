---
paths:
  - "apps/mobile/**"
---

# Mobile app rules

Build screens to the bar in `.claude/skills/appllama-app-design-skill`. Where it and this file
differ, this file wins.

- **Colours and radii come from `useTheme()`** (`apps/mobile/src/theme.ts`), which reads the brand in
  `packages/theme`. Do not use system semantic colours, hex values or radius numbers in a screen. The
  skill's "semantic colours" rule is met by the theme's roles: `text`, `surface`, `accent`, `danger`.
- **Platform-only code lives in `src/platform/ios` or `src/platform/android`** and is reached through
  `platform` from `@/platform`. A screen never imports a module that exists on one platform only, and
  never branches on `Platform.OS` for behaviour: add the behaviour to `PlatformApi` instead.
- **Android is not iOS with a different font.** The skill is written around iOS. On Android: 48dp
  touch targets (`theme.minTouch`), the hardware back button must do what the back arrow does,
  content draws edge to edge under the system bars, and Material's ripple and elevation are the
  expected feedback and depth.
- **Data comes through `api`** (`src/lib/api.ts`), the same contract the web app uses. No `fetch` to
  the product's API from a screen.
- **Signed-in and signed-out screens are separate groups** guarded in `src/app/_layout.tsx`. Never
  navigate to sign-in or to the app by hand; change the session and the root layout swaps them.
- **Every interactive element has a `testID` or visible text** that the Maestro flows in `.maestro/`
  can find. A new screen gets a flow.
- **Check your work**: `npm run typecheck` and the three `export:*` scripts in `apps/mobile`, then
  `npm run preview` to see shared screens in a browser. Real devices are still required before a
  release: the preview does not run `src/platform` code.
