// The signed-in app: two tabs. Tabs are peers; each keeps its own place.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { useTheme } from "@/theme";

type IconProps = { color: ColorValue; size: number };
const tint = (color: ColorValue) => (typeof color === "string" ? color : undefined);

function HomeIcon({ color, size }: IconProps) {
  return <Ionicons name="home-outline" color={tint(color)} size={size} />;
}

function SettingsIcon({ color, size }: IconProps) {
  return <Ionicons name="settings-outline" color={tint(color)} size={size} />;
}

export default function AppLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.color.background },
        headerTitleStyle: { color: theme.color.text },
        sceneStyle: { backgroundColor: theme.color.background },
        tabBarActiveTintColor: theme.color.accentText,
        tabBarInactiveTintColor: theme.color.textSecondary,
        tabBarStyle: { backgroundColor: theme.color.surface, borderTopColor: theme.color.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: SettingsIcon }} />
    </Tabs>
  );
}
