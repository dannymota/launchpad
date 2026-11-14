// A grouped list of label and value rows, as in the system Settings app.
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme";

export function Rows({ title, children }: { title?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space(2) }}>
      {title ? (
        <Text
          style={{ color: theme.color.textSecondary, fontSize: theme.bodySize - 3, paddingHorizontal: theme.space(1) }}
        >
          {title}
        </Text>
      ) : null}
      <View
        style={[
          styles.group,
          {
            backgroundColor: theme.color.surface,
            borderColor: theme.color.border,
            borderRadius: theme.radius.container,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: theme.color.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          minHeight: theme.minTouch,
          paddingHorizontal: theme.space(4),
        },
      ]}
    >
      <Text style={{ color: theme.color.text, fontSize: theme.bodySize }}>{label}</Text>
      <Text
        selectable
        numberOfLines={1}
        style={[styles.value, { color: theme.color.textSecondary, fontSize: theme.bodySize }]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderCurve: "continuous", borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  row: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  value: { flexShrink: 1, textAlign: "right" },
});
