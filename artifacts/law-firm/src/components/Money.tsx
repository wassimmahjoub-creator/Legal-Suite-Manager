import { formatCurrency, type CurrencyLocale } from "@/lib/currency";
import { useLocale } from "@/context/LocaleContext";

interface MoneyProps {
  amount: number;
  locale?: CurrencyLocale;
  className?: string;
}

/**
 * Affiche un montant en dinars tunisiens.
 * Lit la locale depuis LocaleContext (défaut "ar") sauf si locale est passé en prop.
 */
export function Money({ amount, locale, className }: MoneyProps) {
  const ctxLocale = useLocale();
  return (
    <span dir="ltr" className={`font-mono whitespace-nowrap${className ? ` ${className}` : ""}`}>
      {formatCurrency(amount, locale ?? ctxLocale)}
    </span>
  );
}
