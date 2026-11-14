// The brand, as a handful of decisions. Everything visual starts here: the web Astryx theme
// (apps/web/src/themes/brand) is built from it, and the same values are written from that
// build as plain numbers (src/generated/tokens.ts) for whatever is not a web page.
// The mobile app's theme (native.ts) reads those numbers, so it cannot drift from the website.
//
// /brand rewrites this file: it sets the seed colour in palette.config.json, regenerates
// palette.ts with Astryx's palette tool, and picks the stops below. After any edit run
// `npm run theme`.
import { palette } from "./palette";

const { accent } = palette;

/** A colour as [in light mode, in dark mode]. */
export type Pair = readonly [light: string, dark: string];

export const brand = {
  /**
   * The look in a sentence or two, for people and for the design skill: it opens DESIGN.md.
   * Say what it is, not what it avoids.
   */
  character:
    "Plain and exact: neutral surfaces, one blue accent, soft corners. It reads as a working tool, and the content is the loudest thing on the page.",
  color: {
    /** Buttons, links, the focus ring: the one colour that says "this product". */
    accent: [accent.light[45], accent.dark[70]] as Pair,
    /** Text and icons on top of the accent. */
    onAccent: ["#ffffff", accent.dark[10]] as Pair,
    /** A quiet fill of the accent: a selected row, a highlighted note. */
    accentMuted: [accent.light[90], accent.dark[25]] as Pair,
    /** Accent-coloured text on the page background. Darker than the fill, so it reads at small sizes. */
    accentText: [accent.light[40], accent.dark[75]] as Pair,
  },
  /** Corner radii in px: small parts, controls, cards, and page-level panels. */
  radius: { inner: 6, element: 10, container: 12, page: 28 },
  font: {
    /** Loaded on the web by the theme's font stylesheet. Where there is none, the system font stands in. */
    body: "Figtree",
    heading: "Figtree",
  },
} as const;

export type Brand = typeof brand;
