import React from "react";
import { formatTND } from "@/lib/currency";

interface MoneyProps {
  amount: number | string | null | undefined;
  className?: string;
}

/**
 * Single component for displaying Tunisian Dinar amounts.
 * Renders: "1.250,000 د.ت" — number left, symbol right.
 *
 * Three nested spans:
 *  - outer: unicode-bidi:isolate  → shields the block from parent RTL context
 *  - number span: dir=ltr + bidi-override → forces strict LTR for digits only
 *  - symbol span: dir=rtl (no override) → lets Arabic letters render naturally RTL
 */
export function TNDAmount({ amount, className }: MoneyProps) {
  return (
    <span
      style={{ unicodeBidi: "isolate", whiteSpace: "nowrap" } as React.CSSProperties}
      className={className}
    >
      <span
        style={{
          direction: "ltr",
          unicodeBidi: "bidi-override",
          fontVariantNumeric: "tabular-nums",
        } as React.CSSProperties}
      >
        {formatTND(amount)}
      </span>
      {" "}
      <span style={{ direction: "rtl" } as React.CSSProperties}>
        {"د.ت"}
      </span>
    </span>
  );
}

/** Backward-compatible alias */
export function Money({ amount, className }: MoneyProps) {
  return <TNDAmount amount={amount} className={className} />;
}
