// Analytics (PostHog) for the app: screen views, app opens, and the events you add with
// track(). On when the build has EXPO_PUBLIC_POSTHOG_KEY, the same public project key the
// web uses; off otherwise. Events go to /ingest on the product's own Worker.
//
// Before shipping with it on, declare analytics in the App Store privacy label and Google
// Play's data safety form (docs/MOBILE.md).
import { usePathname } from "expo-router";
import PostHog, { PostHogProvider } from "posthog-react-native";
import { type ReactNode, useEffect } from "react";
import { API_ORIGIN } from "./config";

const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const client =
  key && API_ORIGIN ? new PostHog(key, { host: `${API_ORIGIN}/ingest`, captureAppLifecycleEvents: true }) : null;

/** Reports each screen as the route changes. expo-router owns navigation, so this follows its path. */
function ScreenViews() {
  const pathname = usePathname();
  useEffect(() => {
    void client?.screen(pathname);
  }, [pathname]);
  return null;
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!client) return children;
  return (
    <PostHogProvider client={client} autocapture={{ captureScreens: false, captureTouches: false }}>
      <ScreenViews />
      {children}
    </PostHogProvider>
  );
}

/** Records a product event, e.g. track("report_exported", { format: "csv" }). Does nothing while analytics is off. */
export function track(event: string, properties?: Record<string, string | number | boolean | null>): void {
  client?.capture(event, properties);
}
