// Shared by both platforms: the same three moments, each platform's own feel.
import * as Haptics from "expo-haptics";

export function haptic(kind: "success" | "error" | "selection"): void {
  if (kind === "selection") void Haptics.selectionAsync();
  else if (kind === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
