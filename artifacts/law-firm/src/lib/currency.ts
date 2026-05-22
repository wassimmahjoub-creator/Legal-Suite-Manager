export type CurrencyLocale = "ar" | "fr";

/**
 * Formats a Tunisian Dinar amount without symbol.
 * Thousands separator: dot "."
 * Decimal separator: comma ","
 * Decimals: 3 (millimes)
 *
 * Examples:
 *   formatTND(536500)   → "536.500,000"
 *   formatTND(1250)     → "1.250,000"
 *   formatTND(24500.75) → "24.500,750"
 *   formatTND(-99.9)    → "-99,900"
 */
export function formatTND(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const [int, dec] = Math.abs(safe).toFixed(3).split(".");
  const sign = safe < 0 ? "-" : "";
  const withThousands = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${withThousands},${dec}`;
}

/** Alias kept for backward compatibility */
export const formatAmount = formatTND;

/**
 * Formats a monetary amount with currency symbol.
 * Result: "1.250,000 د.ت" — symbol always on the RIGHT.
 * The locale parameter is kept for API compatibility but no longer
 * affects the symbol (always "د.ت").
 */
export function formatCurrency(amount: number | string | null | undefined, locale: CurrencyLocale = "ar"): string {
  return `${formatTND(amount)} د.ت`;
}
