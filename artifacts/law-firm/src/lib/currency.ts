export type CurrencyLocale = "ar" | "fr";

/**
 * Formate un nombre en dinars tunisiens sans symbole.
 * Séparateur de milliers : U+202F (espace fine insécable)
 * Séparateur décimal    : virgule
 * Décimales             : 3 (millimes)
 *
 * Exemples :
 *   formatAmount(536500)   → "536 500,000"
 *   formatAmount(1234.5)   → "1 234,500"
 *   formatAmount(-99.9)    → "-99,900"
 *   formatAmount("536500") → "536 500,000"
 */
export function formatAmount(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const [int, dec] = Math.abs(safe).toFixed(3).split(".");
  const sign = safe < 0 ? "-" : "";
  return `${sign}${int.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${dec}`;
}

/**
 * Formate un montant monétaire avec symbole de devise.
 * Résultat : "536 500,000 د.ت" (ar) ou "536 500,000 DT" (fr)
 * Le symbole est toujours après le nombre — le RTL de la page
 * l'affiche visuellement à gauche sans manipulation manuelle.
 */
export function formatCurrency(amount: number | string | null | undefined, locale: CurrencyLocale = "ar"): string {
  const suffix = locale === "ar" ? "د.ت" : "DT";
  return `${suffix} ${formatAmount(amount)}`;
}
