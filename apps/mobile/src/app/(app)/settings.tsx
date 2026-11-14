// Settings: who is signed in, sign out, delete the account, and the app's version.
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Row, Rows } from "@/components/Rows";
import { Screen } from "@/components/Screen";
import { api, errorMessage } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { APP_NAME, APP_VERSION } from "@/lib/config";
import { useSession } from "@/lib/session";
import { platform } from "@/platform";
import { useTheme } from "@/theme";

export default function Settings() {
  const theme = useTheme();
  const { user } = useSession();
  const [busy, setBusy] = useState<"sign-out" | "delete" | null>(null);

  const signOut = async () => {
    setBusy("sign-out");
    await authClient.signOut();
    // The root layout unmounts the app once the session is gone; nothing to navigate.
  };

  const deleteAccount = async () => {
    setBusy("delete");
    try {
      await api.account.delete({ confirm: "delete my account" });
      platform.haptic("success");
      await authClient.signOut();
    } catch (error) {
      setBusy(null);
      platform.haptic("error");
      Alert.alert("Couldn't delete your account", errorMessage(error));
    }
  };

  const confirmDelete = () =>
    Alert.alert("Delete your account?", "Your account and its data are removed for good. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete account", style: "destructive", onPress: () => void deleteAccount() },
    ]);

  return (
    <Screen>
      <Rows title="Account">
        <Row label="Email" value={user?.email ?? ""} last />
      </Rows>
      <View style={{ gap: theme.space(3) }}>
        <Button
          label="Sign out"
          variant="secondary"
          loading={busy === "sign-out"}
          onPress={() => void signOut()}
          testID="sign-out"
        />
        <Button
          label="Delete account"
          variant="destructive"
          loading={busy === "delete"}
          onPress={confirmDelete}
          testID="delete-account"
        />
      </View>
      <Text style={{ color: theme.color.textDisabled, fontSize: theme.bodySize - 4, textAlign: "center" }}>
        {APP_NAME} {APP_VERSION}
      </Text>
    </Screen>
  );
}
