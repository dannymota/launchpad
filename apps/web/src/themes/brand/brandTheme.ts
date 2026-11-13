// The product's web theme: Astryx's Neutral theme with the brand from packages/theme.
// Pages never set colours or radii themselves; they use components, and components read
// these tokens. To change the look, edit packages/theme/src/brand.ts, then run `npm run theme`.
//
// Add a token here only when the brand needs something Neutral does not already decide.
// `npx astryx theme targets` lists what a theme can override.
import { brand } from "@app/theme";
import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

const SANS_FALLBACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
const rem = (px: number) => `${px / 16}rem`;
const pair = ([light, dark]: readonly [string, string]): [string, string] => [light, dark];

export const brandTheme = defineTheme({
  name: "brand",
  extends: neutralTheme,

  typography: {
    body: { family: brand.font.body, fallbacks: SANS_FALLBACK },
    heading: { family: brand.font.heading, fallbacks: SANS_FALLBACK },
  },

  tokens: {
    "--color-accent": pair(brand.color.accent),
    "--color-on-accent": pair(brand.color.onAccent),
    "--color-accent-muted": pair(brand.color.accentMuted),
    "--color-text-accent": pair(brand.color.accentText),
    "--color-icon-accent": pair(brand.color.accentText),

    "--radius-inner": rem(brand.radius.inner),
    "--radius-element": rem(brand.radius.element),
    "--radius-container": rem(brand.radius.container),
    "--radius-page": rem(brand.radius.page),
  },
});
