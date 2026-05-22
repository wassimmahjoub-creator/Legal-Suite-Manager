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
 * Two nested spans:
 *  - outer: unicode-bidi:isolate  → shields the block from parent RTL context
 *  - inner: dir=ltr + bidi-override → forces strict LTR for digits AND Arabic symbol
 */
export function TNDAmount({ amount, className }: MoneyProps) {
  return (
    <span
      style={{ unicodeBidi: "isolate", whiteSpace: "nowrap" } as React.CSSProperties}
      className={className}
    >
      <span
        dir="ltr"
        style={{
          direction: "ltr",
          unicodeBidi: "bidi-override",
          fontVariantNumeric: "tabular-nums",
          fontFamily: "inherit",
        } as React.CSSProperties}
      >
        {formatTND(amount)}&nbsp;د.ت
      </span>
    </span>
  );
}

/** Backward-compatible alias */
export function Money({ amount, className }: MoneyProps) {
  return <TNDAmount amount={amount} className={className} />;
}
