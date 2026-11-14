// The root of the app. It decides, from the session, which screens exist: signed out there
// is only sign-in; signed in there is only the app. Because the other group is not mounted,
// back can never return to sign-in after signing in, or to the app after signing out.
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AnalyticsProvider } from "@/lib/analytics";
import { SessionProvider, useSession } from "@/lib/session";
import { useTheme } from "@/theme";

void SplashScreen.preventAutoHideAsync();

function Screens() {
  const theme = useTheme();
  const { loading, user } = useSession();

  // Hold the splash until the stored session is known: never a flash of sign-in before home.
  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);
  if (loading) return null;

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.color.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.color.background },
        headerTintColor: theme.color.accentText,
        headerTitleStyle: { color: theme.color.text },
      }}
    >
      <Stack.Protected guard={user !== null}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={user === null}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const theme = useTheme();
  return (
    <SessionProvider>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      {/* >>> analytics */}
      <AnalyticsProvider>
        {/* <<< analytics */}
        <Screens />
        {/* >>> analytics */}
      </AnalyticsProvider>
      {/* <<< analytics */}
    </SessionProvider>
  );
}
