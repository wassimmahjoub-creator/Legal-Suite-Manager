import { Router } from "express";
import { db, consultationsTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const withClient = () =>
  db.select({
    id: consultationsTable.id,
    clientId: consultationsTable.clientId,
    clientName: clientsTable.name,
    subject: consultationsTable.subject,
    date: consultationsTable.date,
    amount: consultationsTable.amount,
    status: consultationsTable.status,
    notes: consultationsTable.notes,
    createdAt: consultationsTable.createdAt,
  })
  .from(consultationsTable)
  .leftJoin(clientsTable, eq(consultationsTable.clientId, clientsTable.id));

router.get("/consultations", requireAuth, async (req, res) => {
  const { clientId } = req.query as Record<string, string>;
  let rows = await withClient().orderBy(consultationsTable.date);
  if (clientId) rows = rows.filter(r => r.clientId === Number(clientId));
  res.json(rows);
});

router.post("/consultations", requireAuth, async (req, res): Promise<void> => {
  const { clientId, subject, date, amount, status, notes } = req.body as Record<string, string>;
  if (!subject || !date) {
    res.status(400).json({ error: "الموضوع والتاريخ مطلوبان" });
    return;
  }
  const [row] = await db.insert(consultationsTable).values({
    clientId: clientId ? Number(clientId) : null,
    subject, date, status: status ?? "pending",
    amount: amount ? amount : null,
    notes: notes ?? null,
  }).returning();
  res.status(201).json({ ...row, clientName: null });
});

router.put("/consultations/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { clientId, subject, date, amount, status, notes } = req.body as Record<string, string>;
  const [row] = await db.update(consultationsTable).set({
    clientId: clientId ? Number(clientId) : null,
    subject, date, status,
    amount: amount ?? null,
    notes: notes ?? null,
  }).where(eq(consultationsTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "غير موجود" });
    return;
  }
  res.json({ ...row, clientName: null });
});

router.delete("/consultations/:id", requireAuth, async (req, res) => {
  await db.delete(consultationsTable).where(eq(consultationsTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
