// >>> analytics
import { productOf } from "@app/backend";
// <<< analytics
import type { Metadata } from "next";
import "./globals.css";
// >>> analytics
import { getEnv } from "@/lib/server";
import { Analytics } from "./_components/Analytics";
// <<< analytics
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Launchpad", template: "%s · Launchpad" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {/* >>> analytics */}
          <Analytics
            apiKey={getEnv().POSTHOG_KEY}
            uiHost={(getEnv().POSTHOG_HOST || "https://us.i.posthog.com").replace(".i.posthog.com", ".posthog.com")}
            productName={productOf(getEnv()).name}
          />
          {/* <<< analytics */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
