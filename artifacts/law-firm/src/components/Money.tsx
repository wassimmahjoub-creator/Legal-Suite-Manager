import { formatTND } from "@/lib/currency";

interface MoneyProps {
  amount: number | string | null | undefined;
  className?: string;
}

/**
 * Displays a Tunisian Dinar amount.
 * Always renders LTR so digits and symbol stay in the correct visual order
 * even inside an RTL (Arabic) page: "1.250,000 د.ت"
 */
export function TNDAmount({ amount, className }: MoneyProps) {
  return (
    <span
      dir="ltr"
      style={{ unicodeBidi: "isolate", fontVariantNumeric: "tabular-nums" } as React.CSSProperties}
      className={`font-mono whitespace-nowrap${className ? ` ${className}` : ""}`}
    >
      {formatTND(amount)} د.ت
    </span>
  );
}

/** Backward-compatible alias */
export function Money({ amount, className }: MoneyProps) {
  return <TNDAmount amount={amount} className={className} />;
}
