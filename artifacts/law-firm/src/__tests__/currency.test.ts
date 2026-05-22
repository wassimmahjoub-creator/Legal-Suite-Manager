import { describe, it, expect } from "vitest";
import { formatAmount, formatCurrency } from "@/lib/currency";

const NNBSP = " "; // narrow no-break space — séparateur de milliers

describe("formatAmount", () => {
  it("formate 536500 correctement", () => {
    expect(formatAmount(536500)).toBe(`536${NNBSP}500,000`);
  });

  it("formate 1234.5 correctement", () => {
    expect(formatAmount(1234.5)).toBe(`1${NNBSP}234,500`);
  });

  it("formate zéro", () => {
    expect(formatAmount(0)).toBe("0,000");
  });

  it("formate un négatif", () => {
    expect(formatAmount(-99.9)).toBe("-99,900");
  });

  it("accepte une string", () => {
    expect(formatAmount("536500")).toBe(`536${NNBSP}500,000`);
  });

  it("accepte null/undefined → zéro", () => {
    expect(formatAmount(null)).toBe("0,000");
    expect(formatAmount(undefined)).toBe("0,000");
  });

  it("gère NaN → zéro", () => {
    expect(formatAmount("pas-un-nombre")).toBe("0,000");
  });

  it("respecte 3 décimales (millimes)", () => {
    expect(formatAmount(5.1)).toBe("5,100");
  });
});

describe("formatCurrency", () => {
  it("symbole د.ت à GAUCHE du montant (ar par défaut)", () => {
    const result = formatCurrency(536500);
    expect(result).toContain("د.ت");
    expect(result.indexOf("د.ت")).toBeLessThan(result.indexOf("536"));
  });

  it("symbole DT à GAUCHE du montant (fr)", () => {
    const result = formatCurrency(1250.5, "fr");
    expect(result).toContain("DT");
    expect(result.indexOf("DT")).toBeLessThan(result.indexOf("1"));
  });

  it("formate zéro en ar", () => {
    expect(formatCurrency(0, "ar")).toBe("د.ت 0,000");
  });

  it("locale ar par défaut", () => {
    expect(formatCurrency(100)).toContain("د.ت");
    expect(formatCurrency(100)).not.toContain("DT");
  });
});
