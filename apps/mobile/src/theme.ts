// The brand on this device: light or dark, iOS or Android. Values come from packages/theme,
// which is generated from the web theme, so a screen never names a colour or a radius itself.
import { type NativeTheme, nativeTheme } from "@app/theme/native";
import { useMemo } from "react";
import { Platform, useColorScheme } from "react-native";

export type { NativeTheme };

export function useTheme(): NativeTheme {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return useMemo(() => nativeTheme(scheme, Platform.OS === "android" ? "android" : "ios"), [scheme]);
}
