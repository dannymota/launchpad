"use client";

import { LinkProvider } from "@astryxdesign/core/Link";
import { Theme } from "@astryxdesign/core/theme";
import Link from "next/link";
import { defaultThemeSlug, themes } from "../astryx-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <LinkProvider component={Link}>{children}</LinkProvider>
    </Theme>
  );
}
