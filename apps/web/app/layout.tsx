import { productOf } from "@app/backend";
import type { Metadata } from "next";
import "./globals.css";
import { getEnv } from "@/lib/server";
import { Analytics } from "./_components/Analytics";
import { Providers } from "./providers";

/** The product's name and tagline, and its own address once it has one, from product/product.config.ts. */
export function generateMetadata(): Metadata {
  const { name, tagline, domains } = productOf(getEnv());
  return {
    title: { default: name, template: `%s · ${name}` },
    description: tagline || undefined,
    metadataBase: domains.app ? new URL(`https://${domains.app}`) : undefined,
  };
}

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
