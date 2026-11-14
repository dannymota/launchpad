// Home. It makes one API call, the same `whoami` the web app and assistants use, and shows
// every state that call can be in. /feature puts the product's first real screen here.
import type { User } from "@app/shared";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Row, Rows } from "@/components/Rows";
import { Screen } from "@/components/Screen";
import { api, errorMessage } from "@/lib/api";
import { useTheme } from "@/theme";

type State = { status: "loading" } | { status: "ready"; me: User } | { status: "failed"; message: string };

export default function Home() {
  const theme = useTheme();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", me: await api.account.whoami() });
    } catch (error) {
      setState({ status: "failed", message: errorMessage(error) });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <Text style={{ color: theme.color.textSecondary, fontSize: theme.bodySize }}>
        You're signed in. Your product's first screen goes here.
      </Text>
      {state.status === "loading" ? <ActivityIndicator color={theme.color.accent} /> : null}
      {state.status === "ready" ? (
        <Rows title="Account">
          <Row label="Email" value={state.me.email} />
          <Row label="Account ID" value={state.me.id} last />
        </Rows>
      ) : null}
      {state.status === "failed" ? (
        <View style={{ gap: theme.space(3) }}>
          <Text style={{ color: theme.color.danger, fontSize: theme.bodySize }}>{state.message}</Text>
          <Button label="Try again" variant="secondary" onPress={() => void load()} />
        </View>
      ) : null}
    </Screen>
  );
}
