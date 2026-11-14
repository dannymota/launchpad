// Android. Google first: nearly every Android phone is already signed in to a Google account.
import * as SecureStore from "expo-secure-store";
import { haptic } from "./haptics";
import type { PlatformApi } from "./types";

export const platform: PlatformApi = {
  storage: SecureStore,
  providerOrder: ["google", "apple"],
  // No system sheet for Apple on Android: it opens in the browser like any other provider.
  appleSignIn: null,
  AppleButton: null,
  haptic,
};
