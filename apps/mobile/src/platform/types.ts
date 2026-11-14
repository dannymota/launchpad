// What the shared screens may ask of the platform. iOS and Android each implement this in
// their own folder; nothing outside src/platform imports a platform-only module.
import type { ExpoClientStorage } from "@better-auth/expo/client";
import type { ComponentType } from "react";

export type Provider = "apple" | "google";

export interface PlatformApi {
  /** Where the session is kept. */
  storage: ExpoClientStorage;
  /** Sign-in providers in the order this platform's users expect them. */
  providerOrder: Provider[];
  /**
   * The system's own Sign in with Apple sheet, where the platform has one. Resolves to the
   * identity token to hand to the server, or null if the person closed the sheet.
   */
  appleSignIn: (() => Promise<{ token: string; nonce?: string } | null>) | null;
  /** The system-drawn Apple button, where the platform has one. Elsewhere the app's own button is used. */
  AppleButton: ComponentType<{ onPress(): void; dark: boolean; radius: number }> | null;
  /** A short haptic: on the same frame as the visual change, one per action. */
  haptic(kind: "success" | "error" | "selection"): void;
}
