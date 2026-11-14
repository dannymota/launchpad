// iOS. Apple first: it is the one-tap option here, and the native sheet needs no browser.
import * as SecureStore from "expo-secure-store";
import { haptic } from "./haptics";
import { AppleButton } from "./ios/AppleButton";
import { appleSignIn } from "./ios/apple-sign-in";
import type { PlatformApi } from "./types";

export const platform: PlatformApi = {
  storage: SecureStore,
  providerOrder: ["apple", "google"],
  appleSignIn,
  AppleButton,
  haptic,
};
