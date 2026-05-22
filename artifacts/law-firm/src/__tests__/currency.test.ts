import { describe, it, expect } from "vitest";
import { formatTND, formatAmount, formatCurrency } from "@/lib/currency";

describe("formatTND", () => {
  it("formats 536500 correctly", () => {
    expect(formatTND(536500)).toBe("536.500,000");
  });

  it("formats 1250 correctly", () => {
    expect(formatTND(1250)).toBe("1.250,000");
  });

  it("formats 24500.75 correctly", () => {
    expect(formatTND(24500.75)).toBe("24.500,750");
  });

  it("formats 850 correctly", () => {
    expect(formatTND(850)).toBe("850,000");
  });

  it("formats zero", () => {
    expect(formatTND(0)).toBe("0,000");
  });

  it("formats negative", () => {
    expect(formatTND(-99.9)).toBe("-99,900");
  });

  it("accepts a string", () => {
    expect(formatTND("536500")).toBe("536.500,000");
  });

  it("accepts null/undefined → zero", () => {
    expect(formatTND(null)).toBe("0,000");
    expect(formatTND(undefined)).toBe("0,000");
  });

  it("handles NaN → zero", () => {
    expect(formatTND("not-a-number")).toBe("0,000");
  });

  it("respects 3 decimals (millimes)", () => {
    expect(formatTND(5.1)).toBe("5,100");
  });
});

describe("formatAmount (alias)", () => {
  it("is the same as formatTND", () => {
    expect(formatAmount(1250)).toBe("1.250,000");
  });
});

describe("formatCurrency", () => {
  it("symbol د.ت always on the RIGHT", () => {
    const result = formatCurrency(536500);
    expect(result).toBe("536.500,000 د.ت");
  });

  it("symbol د.ت on the right even for locale fr", () => {
    const result = formatCurrency(1250.5, "fr");
    expect(result).toBe("1.250,500 د.ت");
    expect(result.indexOf("د.ت")).toBeGreaterThan(result.indexOf("1"));
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("0,000 د.ت");
  });

  it("always returns د.ت (never DT)", () => {
    expect(formatCurrency(100, "fr")).toContain("د.ت");
    expect(formatCurrency(100, "fr")).not.toContain("DT");
    expect(formatCurrency(100)).toContain("د.ت");
  });
});
