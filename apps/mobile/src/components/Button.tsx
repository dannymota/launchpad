// The app's button. One accent, one shape: a "primary" is the accent, a "secondary" is a
// quiet fill, a "plain" is text only, "destructive" is for actions that cannot be undone.
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme";

type Variant = "primary" | "secondary" | "plain" | "destructive";

export function Button(props: {
  label: string;
  onPress(): void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const { label, onPress, variant = "primary", loading = false, disabled = false, testID } = props;
  const inactive = disabled || loading;
  const fill = {
    primary: theme.color.accent,
    secondary: theme.color.surface,
    plain: "transparent",
    destructive: "transparent",
  }[variant];
  const ink = {
    primary: theme.color.onAccent,
    secondary: theme.color.text,
    plain: theme.color.accentText,
    destructive: theme.color.danger,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: fill,
          // A secondary button is the surface colour with a hairline, so it reads on any background.
          borderColor: variant === "secondary" ? theme.color.borderStrong : "transparent",
          borderRadius: theme.radius.element,
          minHeight: theme.minTouch,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ink} />
      ) : (
        <Text style={[styles.label, { color: ink, fontSize: theme.bodySize }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  label: { fontWeight: "600" },
});
