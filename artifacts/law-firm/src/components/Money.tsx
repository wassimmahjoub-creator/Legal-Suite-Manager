import React from "react";
import { formatTND } from "@/lib/currency";

interface MoneyProps {
  amount: number | string | null | undefined;
  className?: string;
  // kept for API compatibility, unused
  locale?: string;
}

/**
 * Affichage d'un montant en dinar tunisien.
 *
 * Format cible : "د.ت 1.250,000"
 *   - Symbole  د.ت  à GAUCHE
 *   - Montant en format tunisien à DROITE (séparateur milliers = ".", décimal = ",", 3 décimales)
 *
 * Fonctionnement BiDi (page arabe RTL) :
 *   - dir="rtl" sur le span externe  → flux RTL : 1er enfant HTML = droite, 2e enfant HTML = gauche
 *   - unicodeBidi:"isolate"          → la portée BiDi est isolée, n'affecte pas le parent
 *   - bidi-override ltr sur chaque span interne → les caractères s'affichent dans l'ordre mémoire
 *
 * Ordre HTML  :  [montant][espace][symbole]
 * Rendu RTL   :  [symbole à gauche]  [montant à droite]
 */
export function TNDAmount({ amount, className }: MoneyProps) {
  return (
    <span
      dir="rtl"
      style={{
        unicodeBidi: "isolate",
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
      } as React.CSSProperties}
      className={className}
    >
      {/* 1er en HTML → positionné à DROITE dans le flux RTL */}
      <span
        style={{ direction: "ltr", unicodeBidi: "bidi-override" } as React.CSSProperties}
      >
        {formatTND(amount)}
      </span>
      {" "}
      {/* 2e en HTML → positionné à GAUCHE dans le flux RTL */}
      <span
        style={{ direction: "ltr", unicodeBidi: "bidi-override" } as React.CSSProperties}
      >
        {"د.ت"}
      </span>
    </span>
  );
}

/** Alias rétrocompatible */
export function Money({ amount, className }: MoneyProps) {
  return <TNDAmount amount={amount} className={className} />;
}
