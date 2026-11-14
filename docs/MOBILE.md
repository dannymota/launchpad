# Mobile: the iOS and Android app

`apps/mobile` is one Expo app that builds for both platforms. If the product has no app,
`npm run remove -- mobile` takes it out, with the `mobile` block in `product/product.config.ts`.

## Where things are

```
apps/mobile/
  app.config.ts        name, scheme, bundle id and API address, read from the product config;
                       an `ios` block and an `android` block for what differs
  src/app/             screens shared by both platforms (expo-router)
  src/components/      shared UI
  src/lib/             the API client, sign-in, config, the server's sign-in methods and min version
  src/platform/
    ios/               iOS-only code: the native Sign in with Apple sheet and button
    android/           Android-only code
    index.ios.ts  index.android.ts  index.ts
                       the one interface screens use; Metro picks the file for the platform
  .maestro/            end-to-end flows: sign in, settings
  .eas/workflows/      build, end-to-end and submit pipelines
  store.config.json    the App Store listing (EAS Metadata)
  store/ios/  store/android/   screenshots, review notes, the Play listing
```

The app has its own `node_modules` and lockfile, outside the repo's npm workspaces, because Expo
pins exact React and TypeScript versions that the web app does not share. It imports only
`packages/shared` (the API client and types) and `packages/theme` (the brand).

## Running it

```bash
cd apps/mobile && npm install
```

With no simulator (a cloud session, CI), preview the shared screens in a browser against a local
Worker that is running in the launched setup (`DEV_PRESET=public-product` in `apps/web/.dev.vars`):

```bash
npm run preview
```

On a Mac with Xcode or Android Studio, point a build at your local Worker and open it:

```bash
EXPO_PUBLIC_API_ORIGIN=http://localhost:8787 npx expo run:ios
```

```bash
EXPO_PUBLIC_API_ORIGIN=http://10.0.2.2:8787 npx expo run:android
```

## Sign-in

The server decides which methods are on (`/health`), and each platform puts its own first.

|       | iOS                                   | Android                               |
| ----- | ------------------------------------- | ------------------------------------- |
| First | Sign in with Apple, the system sheet  | Sign in with Google, in a browser tab |
| Also  | Google in a browser tab; emailed code | emailed code                          |

- Turn Apple and Google on in `product/product.config.ts` (`signIn`) and set their keys as Worker
  secrets. App Review requires Sign in with Apple whenever Google is offered.
- The app is trusted by its URL scheme (the product's slug), not by a web origin.
- With Cloudflare Turnstile on, the app does not offer emailed codes: it has no widget to get a token.
- The product must identify people by session for the app to sign in. Under the `private` preset the
  Cloudflare Access email is the sign-in and an app cannot pass Access. Use `private-beta` while
  testing, and give development builds a service token: set `ACCESS_CLIENT_ID` and
  `ACCESS_CLIENT_SECRET` as EAS secrets for the `development` profile. Store builds never get them.

## Before the first release (needs you)

These cannot be checked without devices and store accounts:

1. Run both platforms on a simulator and a real phone. Walk every screen in light and dark, with large
   text, and record the flow: the design skill in `.claude/skills` lists what to look for.
2. `maestro test .maestro` against a development build.
3. Apple: create the app in App Store Connect, enable Sign in with Apple for the bundle id, set
   `APPLE_TEAM_ID` on the Worker so links to the domain open the app.
4. Google: create the app in the Play Console, upload the first build by hand, set
   `ANDROID_CERT_SHA256` on the Worker to the app signing key's fingerprint.
5. `eas build` and `eas submit` for each platform (`.eas/workflows`).

## What is not here yet

- The native Google sign-in sheet on Android (`src/platform/android/README.md` says how to add it).
- Push notifications and in-app purchases.
- Expo UI's SwiftUI and Jetpack Compose controls are installed (`@expo/ui`) but the starter screens
  do not need a switch, picker or sheet yet. Use them when a feature does, in preference to
  rebuilding a native control.
