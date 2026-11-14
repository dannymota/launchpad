// The frame every screen sits in: scrolls when content is taller than the phone, keeps
// clear of the notch, the home indicator and the keyboard, and paints the theme background.
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useTheme } from "@/theme";

export function Screen({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  const theme = useTheme();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: theme.color.background }}
        contentContainerStyle={{
          flexGrow: 1,
          gap: theme.space(6),
          justifyContent: centered ? "center" : "flex-start",
          padding: theme.space(5),
        }}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
