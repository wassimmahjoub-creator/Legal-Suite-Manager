import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/currency";

describe("formatCurrency", () => {
  it("formate un montant en français avec DT", () => {
    const result = formatCurrency(1250.5, "fr");
    expect(result).toBe(`1\u202f250,500\u00A0DT`);
  });

  it("formate zéro en français", () => {
    expect(formatCurrency(0, "fr")).toBe(`0,000\u00A0DT`);
  });

  it("formate un montant en arabe avec د.ت", () => {
    const result = formatCurrency(1250.5, "ar");
    expect(result).toContain("د.ت");
    expect(result).toContain("1");
    expect(result).toContain("250");
  });

  it("utilise fr par défaut si locale omise", () => {
    expect(formatCurrency(100)).toContain("DT");
    expect(formatCurrency(100)).not.toContain("د.ت");
  });

  it("respecte 3 décimales", () => {
    const result = formatCurrency(5.1, "fr");
    expect(result).toContain("100");
  });

  it("formate des montants négatifs", () => {
    const result = formatCurrency(-500, "fr");
    expect(result).toContain("500");
    expect(result).toContain("DT");
  });
});
