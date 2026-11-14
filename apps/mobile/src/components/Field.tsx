// A labelled text field with room for an error underneath.
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { useTheme } from "@/theme";

export function Field(props: TextInputProps & { label: string; error?: string | null }) {
  const theme = useTheme();
  const { label, error, style, ...input } = props;
  return (
    <View style={{ gap: theme.space(1.5) }}>
      <Text style={{ color: theme.color.textSecondary, fontSize: theme.bodySize - 3 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.color.textDisabled}
        selectionColor={theme.color.accent}
        {...input}
        style={[
          styles.input,
          {
            backgroundColor: theme.color.surface,
            borderColor: error ? theme.color.danger : theme.color.borderStrong,
            borderRadius: theme.radius.element,
            color: theme.color.text,
            fontSize: theme.bodySize,
            minHeight: theme.minTouch + 4,
            paddingHorizontal: theme.space(3.5),
          },
          style,
        ]}
      />
      {error ? <Text style={{ color: theme.color.danger, fontSize: theme.bodySize - 3 }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderCurve: "continuous", borderWidth: StyleSheet.hairlineWidth * 2 },
});
