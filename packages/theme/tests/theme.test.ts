// The brand, checked: every text colour can be read on every background it lands on, in
// light and dark, and the generated tokens carry the same values as the brand they came from.
import { describe, expect, it } from "vitest";
import { brand } from "../src/brand";
import { tokens } from "../src/generated/tokens";
import { nativeTheme } from "../src/native";

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const channel = (index: number) => {
    const value = Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

const AA_TEXT = 4.5;
const AA_LARGE = 3;

describe.each(["light", "dark"] as const)("%s mode", (scheme) => {
  const color = tokens.color[scheme];
  const surfaces = { background: color.background, surface: color.surface, card: color.card, muted: color.muted };

  it("keeps body text readable on every surface", () => {
    for (const [name, surface] of Object.entries(surfaces)) {
      expect(contrast(color.text, surface), `text on ${name}`).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(color.textSecondary, surface), `secondary text on ${name}`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it("keeps text readable on the quiet accent fill (a selected row, a highlighted note)", () => {
    expect(contrast(color.text, color.accentMuted), "text on the muted accent").toBeGreaterThanOrEqual(AA_TEXT);
    expect(
      contrast(color.textSecondary, color.accentMuted),
      "secondary text on the muted accent",
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("keeps the label on an accent button readable", () => {
    expect(contrast(color.onAccent, color.accent)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("keeps accent-coloured text and the accent itself visible on every surface", () => {
    for (const [name, surface] of Object.entries(surfaces)) {
      expect(contrast(color.accentText, surface), `accent text on ${name}`).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(color.accent, surface), `accent on ${name}`).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it("keeps error and success text readable", () => {
    for (const [name, surface] of Object.entries(surfaces)) {
      expect(contrast(color.danger, surface), `error text on ${name}`).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(color.success, surface), `success text on ${name}`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});

describe("the generated tokens", () => {
  it("carry the brand's accent and radii unchanged", () => {
    expect(tokens.color.light.accent).toBe(brand.color.accent[0].toLowerCase());
    expect(tokens.color.dark.accent).toBe(brand.color.accent[1].toLowerCase());
    expect(tokens.radius).toEqual(brand.radius);
  });

  // >>> mobile
  it("differ on a phone by platform only where the platforms do", () => {
    const ios = nativeTheme("light", "ios");
    const android = nativeTheme("light", "android");
    expect(ios.color).toEqual(android.color);
    expect(ios.radius).toEqual(android.radius);
    expect([ios.minTouch, android.minTouch]).toEqual([44, 48]);
    expect(ios.space(4)).toBe(16);
  });
  // <<< mobile
});
