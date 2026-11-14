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

## Screen layouts

The layouts for the app's screens, in the shape `docs/LAYOUTS.md` uses for pages: what each is for,
its regions in order, and the rules that make it work. Where the two platforms differ, the rule
says so. Review a screen against them with `/impeccable audit` and `/impeccable critique`.

### Tab shell

The frame of the signed-in app: a few sections of equal rank, each keeping its own place.

**Regions**

1. The root stack: the signed-out screens or the signed-in ones, never both.
2. Tabs: two to five top-level sections, each with an icon and a one-word label.
3. A stack inside each tab.
4. Modals and sheets, above the tabs.

**Rules**

- Tabs navigate and never act. A button that does something belongs on a screen (Apple).
- Never hide or disable a tab. A section with nothing in it yet says why, and how to fill it
  (Apple).
- Each tab keeps its own stack. Choosing the tab you are on returns to its first screen, at the
  top.
- The bar differs. iOS: a tab bar at the foot of the screen, which on iPad sits at the top or
  turns into a sidebar. Android: a navigation bar with three to five destinations, which becomes
  a rail on a wide screen (Material). `expo-router/native-tabs` draws each platform's own bar and
  allows at most five tabs on Android.
- Back differs. iOS: the swipe from the left edge. Android: the system Back gesture or button.
  Both do what the back arrow does, and neither is ever blocked.

**Sources**:
[Apple, tab bars](https://developer.apple.com/design/human-interface-guidelines/components/navigation-and-search/tab-bars),
[Material 3, navigation bar](https://m3.material.io/components/navigation-bar/guidelines),
[Expo, native tabs](https://docs.expo.dev/router/advanced/native-tabs).

### List, detail, form and settings screens

The four screens most features are made of.

**Regions**

1. List: title, search when the list is long, rows, pull to refresh.
2. Detail: a pushed screen, with the record's name as its title and its actions in the bar.
3. Form: a modal or a sheet, with Cancel, the fields and Save.
4. Settings: groups of rows, each row showing its current value, and a screen of its own for a
   long group.

**Rules**

- A touch target is at least 44pt on iOS and 48dp on Android.
- One sheet at a time, and a Done button always has Cancel or Back beside it (Apple).
- A form's buttons differ. iOS: Cancel at the leading edge of the bar, Done at the trailing edge.
  Android: a form with several fields is a full-screen dialog, and a single field a plain dialog.
- A form sheet (`presentation: "formSheet"`) rests at up to three heights on Android and at any
  number on iOS. On Android it draws no header, so its title and buttons go in its content (Expo).
- Settings: with fifteen or more, group related ones on a screen of their own. Android's guidance
  keeps account management and the app's version off the settings screen. `FieldGroup` from
  `@expo/ui` draws a SwiftUI form on iOS and a Material grouped list on Android from one component.
- States: every list has three besides ready: loading, empty, and failed with a retry. Pull to
  refresh keeps the rows on screen while it works.

**Sources**:
[Apple, sheets](https://developer.apple.com/design/human-interface-guidelines/sheets),
[Android, settings](https://developer.android.com/design/ui/mobile/guides/patterns/settings),
[Android, settings guidelines](https://source.android.com/docs/core/settings/settings-guidelines),
[Expo, modals and form sheets](https://docs.expo.dev/router/advanced/modals/),
[Expo, FieldGroup](https://docs.expo.dev/versions/latest/sdk/ui/universal/fieldgroup/).

### Onboarding and paywall

The first screens a new person meets, and the screen that sells a subscription.

**Regions**

1. Onboarding: nothing, or up to three screens that can be skipped.
2. Paywall, in this order: a headline that names the benefit; the plans, with the amount charged
   as the largest price on the screen; for a trial, its length and the price after it; the
   purchase button; Restore purchases, with links to the terms and to the privacy policy; a way to
   close.

**Rules**

- No slideshow of features at first launch: people skip it, and it reads as marketing (NN/g).
  Teach by letting them do the first task, with tips where they are needed (Apple).
- The requirements differ. Apple: the screen shows the subscription's name and length, what it
  gives, the amount charged as the most prominent price, and a way to restore. Google: the cost,
  the cycle and the renewal terms are visible without a further tap, and the app has a way to
  manage or cancel the subscription. A shared screen carries both.
- Where the paywall goes is a product decision. In RevenueCat's 2026 data a hard paywall turns
  10.7% of downloads into payers by day 35 at the median, against 2.1% for freemium, with about
  the same retention after a year. 55% of cancellations of a three-day trial come on its first
  day.
- States: prices loading, a purchase in progress, a purchase that failed or was cancelled (say
  which, and that nothing was charged), and a restore that found nothing.

**Sources**:
[Apple, subscriptions](https://developer.apple.com/app-store/subscriptions/),
[Apple, onboarding](https://developer.apple.com/design/human-interface-guidelines/patterns/onboarding),
[Google Play, subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533),
[NN/g, onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/),
[RevenueCat, State of Subscription Apps](https://www.revenuecat.com/state-of-subscription-apps).
