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

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

// ── Test cases (5) ─────────────────────────────────────────────────────────────
if (process.env.RUN_CALC_TESTS === "1") {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`FAIL: ${msg}`);
    console.log(`PASS: ${msg}`);
  };

  // T1: single line, 19% TVA, no retenue
  (() => {
    const l = calcLine({ quantity: 2, unitPriceHt: 500, vatRate: 19 });
    assert(l.lineTotalHt === 1000, "T1 lineTotalHt");
    assert(l.lineVat === 190, "T1 lineVat");
    const t = calcTotals([l], 0, false);
    assert(t.subtotalHt === 1000, "T1 subtotalHt");
    assert(t.vatTotal === 190, "T1 vatTotal");
    assert(t.totalTtc === 1191, "T1 totalTtc");
    assert(t.withholdingTax === 0, "T1 withholdingTax");
    assert(t.netToPay === 1191, "T1 netToPay");
  })();

  // T2: retenue 15%
  (() => {
    const l = calcLine({ quantity: 1, unitPriceHt: 1000, vatRate: 19 });
    const t = calcTotals([l], 15, false);
    assert(t.withholdingTax === 150, "T2 withholdingTax=150");
    assert(t.netToPay === round3(1000 + 190 + 1 - 150), "T2 netToPay");
  })();

  // T3: exonéré de retenue (withholdingExempt=true)
  (() => {
    const l = calcLine({ quantity: 1, unitPriceHt: 2000, vatRate: 19 });
    const t = calcTotals([l], 15, true);
    assert(t.withholdingTax === 0, "T3 withholdingTax=0 (exonéré)");
    assert(t.netToPay === t.totalTtc, "T3 netToPay=totalTtc");
  })();

  // T4: ligne TVA 0% (exonérée)
  (() => {
    const l = calcLine({ quantity: 5, unitPriceHt: 100, vatRate: 0 });
    assert(l.lineVat === 0, "T4 lineVat=0");
    const t = calcTotals([l], 0, false);
    assert(t.vatTotal === 0, "T4 vatTotal=0");
    assert(t.totalTtc === 501, "T4 totalTtc=501 (500+0+1)");
  })();

  // T5: taux mixtes (une ligne 19%, une ligne 0%)
  (() => {
    const l1 = calcLine({ quantity: 1, unitPriceHt: 1000, vatRate: 19 });
    const l2 = calcLine({ quantity: 1, unitPriceHt: 500, vatRate: 0 });
    const t = calcTotals([l1, l2], 10, false);
    assert(t.subtotalHt === 1500, "T5 subtotalHt=1500");
    assert(t.vatTotal === 190, "T5 vatTotal=190");
    assert(t.withholdingTax === 150, "T5 withholdingTax=150");
    assert(t.totalTtc === round3(1500 + 190 + 1), "T5 totalTtc");
    assert(t.netToPay === round3(t.totalTtc - 150), "T5 netToPay");
  })();

  console.log("All invoice calculator tests passed.");
}
