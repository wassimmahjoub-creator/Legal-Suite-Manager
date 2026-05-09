import { Router } from "express";
import { db, invoicesTable, clientsTable, casesTable } from "@workspace/db";
import { eq, isNull, like, sql } from "drizzle-orm";
import { CreateInvoiceBody, UpdateInvoiceBody } from "@workspace/api-zod";

const router = Router();

const withJoins = () =>
  db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      clientId: invoicesTable.clientId,
      clientName: clientsTable.name,
      caseId: invoicesTable.caseId,
      caseName: casesTable.title,
      amount: invoicesTable.amount,
      expenses: invoicesTable.expenses,
      taxAmount: invoicesTable.taxAmount,
      retenue: invoicesTable.retenue,
      description: invoicesTable.description,
      status: invoicesTable.status,
      dueDate: invoicesTable.dueDate,
      notes: invoicesTable.notes,
      createdAt: invoicesTable.createdAt,
    })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(casesTable, eq(invoicesTable.caseId, casesTable.id));

function extractExtras(body: Record<string, unknown>) {
  const str = (key: string) => typeof body[key] === "string" ? (body[key] as string) || null : null;
  const num = (key: string) => {
    const v = body[key];
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : String(n);
  };
  return {
    expenses: num("expenses"),
    taxAmount: num("taxAmount"),
    retenue: num("retenue"),
    description: str("description"),
  };
}

function toNum(v: unknown) { return v !== null && v !== undefined ? Number(v) : null; }

router.get("/invoices", async (req, res) => {
  const { status, clientId } = req.query as Record<string, string>;
  let rows = await withJoins()
    .where(isNull(invoicesTable.deletedAt))
    .orderBy(invoicesTable.createdAt);
  if (status) rows = rows.filter((r) => r.status === status);
  if (clientId) rows = rows.filter((r) => r.clientId === Number(clientId));
  res.json(rows.map((r) => ({
    ...r,
    amount: Number(r.amount),
    expenses: toNum(r.expenses),
    taxAmount: toNum(r.taxAmount),
    retenue: toNum(r.retenue),
  })));
});

router.post("/invoices", async (req, res) => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const year = new Date().getFullYear();
  const yearPrefix = `${year}/`;
  const [count] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(invoicesTable)
    .where(like(invoicesTable.invoiceNumber, `${yearPrefix}%`));
  const next = (count?.cnt ?? 0) + 1;
  const invoiceNumber = `${year}/${String(next).padStart(4, "0")}`;

  const extras = extractExtras(req.body as Record<string, unknown>);
  const [row] = await db.insert(invoicesTable).values({
    ...parsed.data,
    amount: String(parsed.data.amount),
    invoiceNumber,
    ...extras,
  }).returning();
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));
  res.status(201).json({
    ...row,
    amount: Number(row.amount),
    expenses: toNum(row.expenses),
    taxAmount: toNum(row.taxAmount),
    retenue: toNum(row.retenue),
    clientName: client?.name ?? "",
    caseName: null,
  });
});

router.get("/invoices/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await withJoins().where(eq(invoicesTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({
    ...row,
    amount: Number(row.amount),
    expenses: toNum(row.expenses),
    taxAmount: toNum(row.taxAmount),
    retenue: toNum(row.retenue),
  });
});

router.put("/invoices/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const extras = extractExtras(req.body as Record<string, unknown>);
  const [row] = await db.update(invoicesTable).set({
    ...parsed.data,
    amount: String(parsed.data.amount),
    ...extras,
  }).where(eq(invoicesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));
  res.json({
    ...row,
    amount: Number(row.amount),
    expenses: toNum(row.expenses),
    taxAmount: toNum(row.taxAmount),
    retenue: toNum(row.retenue),
    clientName: client?.name ?? "",
    caseName: null,
  });
});

router.patch("/invoices/:id/soft-delete", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.update(invoicesTable).set({ deletedAt: new Date() }).where(eq(invoicesTable.id, id));
  res.json({ deleted: true });
});

router.delete("/invoices/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
  res.status(204).send();
});

export default router;
