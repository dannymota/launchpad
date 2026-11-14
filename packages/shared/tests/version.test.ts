import { describe, expect, it } from "vitest";
import { compareVersions } from "../src/version";

describe("compareVersions", () => {
  it("orders versions by number, not by text", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.9.0", "1.10.0")).toBe(-1);
    expect(compareVersions("2.0.0", "1.99.99")).toBe(1);
    expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
  });

  it("treats a missing or unreadable part as zero", () => {
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
    expect(compareVersions("1", "1.0.1")).toBe(-1);
    expect(compareVersions("", "0.0.1")).toBe(-1);
  });
});
