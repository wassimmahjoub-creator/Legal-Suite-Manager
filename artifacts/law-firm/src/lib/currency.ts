export type CurrencyLocale = "ar" | "fr";

/**
 * Formate un montant monétaire en dinars tunisiens.
 * Utilise Intl.NumberFormat avec 3 décimales.
 */
export function formatCurrency(amount: number, locale: CurrencyLocale = "fr"): string {
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-TN" : "fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
    numberingSystem: "latn",
  }).format(amount);
  const suffix = locale === "ar" ? "د.ت" : "DT";
  return `${formatted}\u00A0${suffix}`;
}
