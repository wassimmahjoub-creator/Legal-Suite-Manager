import { Router } from "express";
import {
  db,
  invoicesTable,
  invoiceLinesTable,
  clientsTable,
  casesTable,
} from "@workspace/db";
import { eq, isNull, desc } from "drizzle-orm";
import { calcLine, calcTotals } from "../services/invoiceCalculator";
import { generateInvoiceNumber } from "../services/invoiceNumberService";
import { CaseEventLogger } from "../services/caseEventLogger.js";

const router = Router();

function toN(v: unknown) {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

function fmtLine(row: typeof invoiceLinesTable.$inferSelect) {
  return {
    ...row,
    quantity: toN(row.quantity),
    unitPriceHt: toN(row.unitPriceHt),
    vatRate: toN(row.vatRate),
    lineTotalHt: toN(row.lineTotalHt),
    lineVat: toN(row.lineVat),
  };
}

type InvoiceRow = typeof invoicesTable.$inferSelect & {
  clientName?: string | null;
  caseName?: string | null;
  clientTaxId?: string | null;
  clientWithholdingRate?: string | null;
  clientWithholdingExempt?: boolean | null;
};

function fmtInvoice(row: InvoiceRow) {
  return {
    ...row,
    subtotalHt: toN(row.subtotalHt),
    vatTotal: toN(row.vatTotal),
    stampDuty: toN(row.stampDuty),
    withholdingTax: toN(row.withholdingTax),
    totalTtc: toN(row.totalTtc),
    netToPay: toN(row.netToPay),
    amountPaid: toN(row.amountPaid),
    balanceDue: toN(row.balanceDue),
    clientWithholdingRate: row.clientWithholdingRate != null ? Number(row.clientWithholdingRate) : null,
  };
}

const withJoins = () =>
  db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      clientId: invoicesTable.clientId,
      clientName: clientsTable.name,
      clientTaxId: clientsTable.taxId,
      clientWithholdingRate: clientsTable.withholdingRate,
      clientWithholdingExempt: clientsTable.withholdingExempt,
      caseId: invoicesTable.caseId,
      caseName: casesTable.title,
      issueDate: invoicesTable.issueDate,
      dueDate: invoicesTable.dueDate,
      status: invoicesTable.status,
      subtotalHt: invoicesTable.subtotalHt,
      vatTotal: invoicesTable.vatTotal,
      stampDuty: invoicesTable.stampDuty,
      withholdingTax: invoicesTable.withholdingTax,
      totalTtc: invoicesTable.totalTtc,
      netToPay: invoicesTable.netToPay,
      amountPaid: invoicesTable.amountPaid,
      balanceDue: invoicesTable.balanceDue,
      paymentTerms: invoicesTable.paymentTerms,
      notes: invoicesTable.notes,
      lockedAt: invoicesTable.lockedAt,
      cancelledByInvoiceId: invoicesTable.cancelledByInvoiceId,
      deletedAt: invoicesTable.deletedAt,
      createdAt: invoicesTable.createdAt,
      updatedAt: invoicesTable.updatedAt,
    })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(casesTable, eq(invoicesTable.caseId, casesTable.id));

// ── List ──────────────────────────────────────────────────────────────────────

router.get("/invoices", async (req, res) => {
  const { status, clientId, deleted } = req.query as Record<string, string>;
  const base = withJoins();
  const rows = deleted === "1"
    ? await base.orderBy(desc(invoicesTable.createdAt))
    : await base.where(isNull(invoicesTable.deletedAt)).orderBy(desc(invoicesTable.createdAt));
  let filtered = rows;
  if (status) filtered = filtered.filter((r) => r.status === status);
  if (clientId) filtered = filtered.filter((r) => r.clientId === Number(clientId));
  res.json(filtered.map(fmtInvoice));
});

// ── Create (draft) ────────────────────────────────────────────────────────────

router.post("/invoices", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const clientId = Number(body.clientId);
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  const [inv] = await db.insert(invoicesTable).values({
    clientId,
    caseId: body.caseId ? Number(body.caseId) : null,
    issueDate: (body.issueDate as string) || null,
    dueDate: (body.dueDate as string) || null,
    paymentTerms: (body.paymentTerms as string) || null,
    notes: (body.notes as string) || null,
    status: "draft",
    subtotalHt: "0", vatTotal: "0", stampDuty: "1.000",
    withholdingTax: "0", totalTtc: "1.000", netToPay: "1.000",
    amountPaid: "0", balanceDue: "1.000",
  }).returning();

  const lines = (body.lines as Array<Record<string, unknown>>) ?? [];
  if (lines.length > 0) {
    await upsertLines(inv.id, lines);
    await recalcInvoice(inv.id, clientId);
  }

  const [fresh] = await withJoins().where(eq(invoicesTable.id, inv.id));
  const freshLines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, inv.id)).orderBy(invoiceLinesTable.position);
  res.status(201).json({ ...fmtInvoice(fresh), lines: freshLines.map(fmtLine) });
});

// ── Get one ───────────────────────────────────────────────────────────────────

router.get("/invoices/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await withJoins().where(eq(invoicesTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  const lines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, id)).orderBy(invoiceLinesTable.position);
  res.json({ ...fmtInvoice(row), lines: lines.map(fmtLine) });
});

// ── Update (only if draft) ────────────────────────────────────────────────────

router.put("/invoices/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.lockedAt) return res.status(409).json({ error: "Facture verrouillée. Créez un avoir pour la corriger." });

  const body = req.body as Record<string, unknown>;
  await db.update(invoicesTable).set({
    caseId: body.caseId ? Number(body.caseId) : null,
    issueDate: (body.issueDate as string) || null,
    dueDate: (body.dueDate as string) || null,
    paymentTerms: (body.paymentTerms as string) || null,
    notes: (body.notes as string) || null,
    updatedAt: new Date(),
  }).where(eq(invoicesTable.id, id));

  const lines = body.lines as Array<Record<string, unknown>> | undefined;
  if (lines !== undefined) {
    await db.delete(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, id));
    if (lines.length > 0) await upsertLines(id, lines);
    await recalcInvoice(id, existing.clientId);
  }

  const [fresh] = await withJoins().where(eq(invoicesTable.id, id));
  const freshLines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, id)).orderBy(invoiceLinesTable.position);
  res.json({ ...fmtInvoice(fresh), lines: freshLines.map(fmtLine) });
});

// ── Issue (lock) ──────────────────────────────────────────────────────────────

router.post("/invoices/:id/issue", async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.lockedAt) return res.status(409).json({ error: "Facture déjà émise" });

  const invoiceNumber = await generateInvoiceNumber();
  const now = new Date();
  const issueDate = (req.body as Record<string, unknown>).issueDate as string | undefined;

  await db.update(invoicesTable).set({
    status: "issued",
    invoiceNumber,
    lockedAt: now,
    issueDate: issueDate || now.toISOString().slice(0, 10),
    updatedAt: now,
  }).where(eq(invoicesTable.id, id));

  const [fresh] = await withJoins().where(eq(invoicesTable.id, id));
  const lines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, id)).orderBy(invoiceLinesTable.position);
  if (fresh?.caseId) {
    void CaseEventLogger.log({
      caseId: fresh.caseId, eventType: "invoice_issued",
      metadata: { invoice_number: invoiceNumber },
      relatedEntityType: "invoice", relatedEntityId: id,
    });
  }
  res.json({ ...fmtInvoice(fresh), lines: lines.map(fmtLine) });
});

// ── Unlock ────────────────────────────────────────────────────────────────────

router.post("/invoices/:id/unlock", async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (!existing.lockedAt) return res.status(409).json({ error: "Facture déjà déverrouillée" });
  if (existing.cancelledByInvoiceId) return res.status(409).json({ error: "Facture annulée, impossible de déverrouiller" });

  await db.update(invoicesTable).set({
    lockedAt: null,
    status: "draft",
    updatedAt: new Date(),
  }).where(eq(invoicesTable.id, id));

  const [fresh] = await withJoins().where(eq(invoicesTable.id, id));
  const lines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, id)).orderBy(invoiceLinesTable.position);
  res.json({ ...fmtInvoice(fresh), lines: lines.map(fmtLine) });
});

// ── Record Payment ────────────────────────────────────────────────────────────

router.post("/invoices/:id/payment", async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (!existing.lockedAt) return res.status(409).json({ error: "Émettez d'abord la facture" });

  const amount = Number((req.body as Record<string, unknown>).amount ?? 0);
  if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: "Montant invalide" });

  const newPaid = toN(existing.amountPaid) + amount;
  const netToPay = toN(existing.netToPay);
  const newBalance = Math.max(0, netToPay - newPaid);
  const newStatus = newBalance <= 0.001 ? "paid" : "partially_paid";

  await db.update(invoicesTable).set({
    amountPaid: newPaid.toFixed(3),
    balanceDue: newBalance.toFixed(3),
    status: newStatus,
    updatedAt: new Date(),
  }).where(eq(invoicesTable.id, id));

  const [fresh] = await withJoins().where(eq(invoicesTable.id, id));
  const lines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, id)).orderBy(invoiceLinesTable.position);
  if (fresh?.caseId) {
    void CaseEventLogger.log({
      caseId: fresh.caseId, eventType: "payment_received",
      metadata: { amount: amount.toFixed(3), invoice_number: existing.invoiceNumber ?? `#${id}` },
      relatedEntityType: "invoice", relatedEntityId: id,
    });
    if (newStatus === "paid") {
      void CaseEventLogger.log({
        caseId: fresh.caseId, eventType: "invoice_paid",
        metadata: { invoice_number: existing.invoiceNumber ?? `#${id}` },
        relatedEntityType: "invoice", relatedEntityId: id,
      });
    } else if (newStatus === "partially_paid") {
      void CaseEventLogger.log({
        caseId: fresh.caseId, eventType: "invoice_partially_paid",
        metadata: { invoice_number: existing.invoiceNumber ?? `#${id}` },
        relatedEntityType: "invoice", relatedEntityId: id,
      });
    }
  }
  res.json({ ...fmtInvoice(fresh), lines: lines.map(fmtLine) });
});

// ── Credit Note (avoir) ───────────────────────────────────────────────────────

router.post("/invoices/:id/credit-note", async (req, res) => {
  const id = Number(req.params.id);
  const [original] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!original) return res.status(404).json({ error: "Not found" });
  if (!original.lockedAt) return res.status(409).json({ error: "Seules les factures émises peuvent être avoirs" });
  if (original.status === "cancelled") return res.status(409).json({ error: "Facture déjà annulée" });

  const originalLines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, id)).orderBy(invoiceLinesTable.position);
  const creditNumber = await generateInvoiceNumber();
  const now = new Date();

  const [credit] = await db.insert(invoicesTable).values({
    invoiceNumber: creditNumber,
    clientId: original.clientId,
    caseId: original.caseId,
    status: "issued",
    issueDate: now.toISOString().slice(0, 10),
    lockedAt: now,
    subtotalHt: (-toN(original.subtotalHt)).toFixed(3),
    vatTotal: (-toN(original.vatTotal)).toFixed(3),
    stampDuty: (-toN(original.stampDuty)).toFixed(3),
    withholdingTax: (-toN(original.withholdingTax)).toFixed(3),
    totalTtc: (-toN(original.totalTtc)).toFixed(3),
    netToPay: (-toN(original.netToPay)).toFixed(3),
    amountPaid: "0",
    balanceDue: (-toN(original.netToPay)).toFixed(3),
    notes: `Avoir sur facture ${original.invoiceNumber ?? `#${id}`}`,
    cancelledByInvoiceId: id,
    updatedAt: now,
  }).returning();

  if (originalLines.length > 0) {
    await db.insert(invoiceLinesTable).values(
      originalLines.map((l) => ({
        invoiceId: credit.id,
        position: l.position,
        description: l.description,
        unit: l.unit,
        quantity: (-toN(l.quantity)).toFixed(3),
        unitPriceHt: l.unitPriceHt,
        vatRate: l.vatRate,
        lineTotalHt: (-toN(l.lineTotalHt)).toFixed(3),
        lineVat: (-toN(l.lineVat)).toFixed(3),
      }))
    );
  }

  await db.update(invoicesTable).set({ status: "cancelled", updatedAt: now }).where(eq(invoicesTable.id, id));

  const [freshCredit] = await withJoins().where(eq(invoicesTable.id, credit.id));
  const creditLines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, credit.id)).orderBy(invoiceLinesTable.position);
  res.status(201).json({ ...fmtInvoice(freshCredit), lines: creditLines.map(fmtLine) });
});

// ── Soft delete ───────────────────────────────────────────────────────────────

router.patch("/invoices/:id/soft-delete", async (req, res) => {
  await db.update(invoicesTable).set({ deletedAt: new Date() }).where(eq(invoicesTable.id, Number(req.params.id)));
  res.json({ deleted: true });
});

router.delete("/invoices/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, id));
  await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
  res.status(204).send();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function upsertLines(invoiceId: number, lines: Array<Record<string, unknown>>) {
  const values = lines.map((l, i) => {
    const qty = Number(l.quantity ?? 1);
    const price = Number(l.unitPriceHt ?? 0);
    const vatRate = Number(l.vatRate ?? 19);
    const calc = calcLine({ quantity: qty, unitPriceHt: price, vatRate });
    return {
      invoiceId,
      position: i,
      description: String(l.description ?? ""),
      unit: (l.unit as string) || "forfait",
      quantity: qty.toFixed(3),
      unitPriceHt: price.toFixed(3),
      vatRate: vatRate.toFixed(2),
      lineTotalHt: calc.lineTotalHt.toFixed(3),
      lineVat: calc.lineVat.toFixed(3),
    };
  });
  if (values.length > 0) await db.insert(invoiceLinesTable).values(values);
}

async function recalcInvoice(invoiceId: number, clientId: number) {
  const lines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, invoiceId));
  const [client] = await db.select({
    withholdingRate: clientsTable.withholdingRate,
    withholdingExempt: clientsTable.withholdingExempt,
  }).from(clientsTable).where(eq(clientsTable.id, clientId));

  const totals = calcTotals(
    lines.map((l) => ({ lineTotalHt: toN(l.lineTotalHt), lineVat: toN(l.lineVat) })),
    toN(client?.withholdingRate),
    client?.withholdingExempt ?? false,
  );

  await db.update(invoicesTable).set({
    subtotalHt: totals.subtotalHt.toFixed(3),
    vatTotal: totals.vatTotal.toFixed(3),
    stampDuty: totals.stampDuty.toFixed(3),
    withholdingTax: totals.withholdingTax.toFixed(3),
    totalTtc: totals.totalTtc.toFixed(3),
    netToPay: totals.netToPay.toFixed(3),
    balanceDue: totals.netToPay.toFixed(3),
    updatedAt: new Date(),
  }).where(eq(invoicesTable.id, invoiceId));
}

export default router;
