export interface LineInput {
  quantity: number;
  unitPriceHt: number;
  vatRate: number;
}

export interface LineResult extends LineInput {
  lineTotalHt: number;
  lineVat: number;
}

export interface InvoiceTotals {
  subtotalHt: number;
  vatTotal: number;
  stampDuty: number;
  totalTtc: number;
  withholdingTax: number;
  netToPay: number;
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

export function calcLine(line: LineInput): LineResult {
  const lineTotalHt = round3(line.quantity * line.unitPriceHt);
  const lineVat = round3(lineTotalHt * (line.vatRate / 100));
  return { ...line, lineTotalHt, lineVat };
}

export function calcTotals(
  lines: { lineTotalHt: number; lineVat: number }[],
  withholdingRate: number,
  withholdingExempt: boolean,
  stampDuty = 1.000,
): InvoiceTotals {
  const subtotalHt = round3(lines.reduce((s, l) => s + l.lineTotalHt, 0));
  const vatTotal = round3(lines.reduce((s, l) => s + l.lineVat, 0));
  const totalTtc = round3(subtotalHt + vatTotal + stampDuty);
  const rate = withholdingExempt ? 0 : (withholdingRate ?? 0);
  const withholdingTax = round3(subtotalHt * (rate / 100));
  const netToPay = round3(totalTtc - withholdingTax);
  return { subtotalHt, vatTotal, stampDuty, totalTtc, withholdingTax, netToPay };
}

export const UNITS = ["forfait", "heure", "déplacement", "acte", "consultation", "vacation"];
export const UNIT_LABELS: Record<string, string> = {
  forfait:      "جزافي",
  heure:        "ساعة",
  "déplacement":"تنقل",
  acte:         "إجراء",
  consultation: "استشارة",
  vacation:     "مهمة",
};
export const VAT_RATES = [0, 7, 13, 19];

export const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  pending: "في الانتظار",
  issued: "مُصدَرة",
  partially_paid: "مدفوعة جزئياً",
  paid: "مدفوعة",
  cancelled: "ملغاة",
};

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  issued: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  partially_paid: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};
