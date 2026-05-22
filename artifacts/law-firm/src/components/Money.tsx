import React from "react";
import { formatTND } from "@/lib/currency";

interface MoneyProps {
  amount: number | string | null | undefined;
  className?: string;
  locale?: string;
}

/**
 * Affiche un montant TND avec le symbole TOUJOURS à GAUCHE :  "د.ت 1.609,500"
 * Utilise inline-flex LTR explicite — contourne complètement l'algorithme bidi.
 */
export function TNDAmount({ amount, className }: MoneyProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "row",
        alignItems: "baseline",
        gap: "0.25em",
        whiteSpace: "nowrap",
        direction: "ltr",
        unicodeBidi: "isolate",
        fontVariantNumeric: "tabular-nums",
        fontFamily: "inherit",
      } as React.CSSProperties}
      className={className}
    >
      <span>د.ت</span>
      <span>{formatTND(amount)}</span>
    </span>
  );
}

export function Money({ amount, className }: MoneyProps) {
  return <TNDAmount amount={amount} className={className} />;
}
