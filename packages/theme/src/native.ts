// The brand on iOS and Android. Colours and radii are generated from the built web theme
// (generated/tokens.ts); what differs by platform is decided here. No React or React
// Native imports: the mobile app wraps this in its own `useTheme()`.
import { tokens } from "./generated/tokens";

export type ColorScheme = "light" | "dark";
export type Platform = "ios" | "android";
export type NativeColors = { [Role in keyof (typeof tokens)["color"]["light"]]: string };

export interface NativeTheme {
  scheme: ColorScheme;
  platform: Platform;
  color: NativeColors;
  radius: { [Role in keyof (typeof tokens)["radius"]]: number };
  /** The 4-point grid both platforms use: `space(4)` is 16. */
  space(steps: number): number;
  /** The smallest a tappable thing may be: 44pt on iOS, 48dp on Android. */
  minTouch: number;
  /** Body text size: each platform's own default, so text sits right beside system UI. */
  bodySize: number;
}

const PLATFORM = {
  ios: { minTouch: 44, bodySize: 17 },
  android: { minTouch: 48, bodySize: 16 },
} as const;

export function nativeTheme(scheme: ColorScheme, platform: Platform): NativeTheme {
  return {
    scheme,
    platform,
    color: tokens.color[scheme],
    radius: tokens.radius,
    space: (steps) => steps * 4,
    ...PLATFORM[platform],
  };
}
