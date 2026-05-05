import { Router } from "express";
import { db, invoicesTable, clientsTable, casesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateInvoiceBody, UpdateInvoiceBody } from "@workspace/api-zod";

const router = Router();

const withJoins = () =>
  db
    .select({
      id: invoicesTable.id,
      clientId: invoicesTable.clientId,
      clientName: clientsTable.name,
      caseId: invoicesTable.caseId,
      caseName: casesTable.title,
      amount: invoicesTable.amount,
      status: invoicesTable.status,
      dueDate: invoicesTable.dueDate,
      notes: invoicesTable.notes,
      createdAt: invoicesTable.createdAt,
    })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(casesTable, eq(invoicesTable.caseId, casesTable.id));

router.get("/invoices", async (req, res) => {
  const { status, clientId } = req.query as Record<string, string>;
  let rows = await withJoins().orderBy(invoicesTable.createdAt);
  if (status) rows = rows.filter((r) => r.status === status);
  if (clientId) rows = rows.filter((r) => r.clientId === Number(clientId));
  res.json(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
});

router.post("/invoices", async (req, res) => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [row] = await db.insert(invoicesTable).values({ ...parsed.data, amount: String(parsed.data.amount) }).returning();
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));
  res.status(201).json({ ...row, amount: Number(row.amount), clientName: client?.name ?? "", caseName: null });
});

router.get("/invoices/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await withJoins().where(eq(invoicesTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, amount: Number(row.amount) });
});

router.put("/invoices/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [row] = await db.update(invoicesTable).set({ ...parsed.data, amount: String(parsed.data.amount) }).where(eq(invoicesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));
  res.json({ ...row, amount: Number(row.amount), clientName: client?.name ?? "", caseName: null });
});

router.delete("/invoices/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
  res.status(204).send();
});

export default router;
