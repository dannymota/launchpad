# Android-only code

Code that only makes sense on Android goes here and is exported through `../index.android.ts`.

Today Android needs nothing of its own beyond that file: sign-in with Google opens in a Chrome
Custom Tab through Better Auth, the hardware back button is handled by the navigator, and edge to
edge is set in `app.config.ts`.

When you add the native Google sign-in sheet (`@react-native-google-signin/google-signin`, which
needs a development build and the OAuth client ids from Google Cloud), put its wrapper here and
return it from `index.android.ts`, the way `../ios/apple-sign-in.ts` is wired for iOS.
