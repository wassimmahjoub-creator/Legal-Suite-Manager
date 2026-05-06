import { Router } from "express";
import { db, communicationsTable, clientsTable, casesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const withRefs = () => db.select({
  id: communicationsTable.id,
  caseId: communicationsTable.caseId,
  clientId: communicationsTable.clientId,
  caseName: casesTable.title,
  clientName: clientsTable.name,
  type: communicationsTable.type,
  date: communicationsTable.date,
  summary: communicationsTable.summary,
  createdBy: communicationsTable.createdBy,
  createdAt: communicationsTable.createdAt,
}).from(communicationsTable)
  .leftJoin(casesTable, eq(communicationsTable.caseId, casesTable.id))
  .leftJoin(clientsTable, eq(communicationsTable.clientId, clientsTable.id));

router.get("/communications", requireAuth, async (req, res) => {
  const { caseId, clientId } = req.query as Record<string, string>;
  let rows = await withRefs().orderBy(communicationsTable.date);
  if (caseId) rows = rows.filter(r => r.caseId === Number(caseId));
  if (clientId) rows = rows.filter(r => r.clientId === Number(clientId));
  res.json(rows.reverse());
});

router.post("/communications", requireAuth, async (req, res): Promise<void> => {
  const { caseId, clientId, type, date, summary, createdBy } = req.body as Record<string, string>;
  if (!summary || !date) { res.status(400).json({ error: "الملخص والتاريخ مطلوبان" }); return; }
  const [row] = await db.insert(communicationsTable).values({
    caseId: caseId ? Number(caseId) : null,
    clientId: clientId ? Number(clientId) : null,
    type: type ?? "call", date, summary, createdBy: createdBy ?? null,
  }).returning();
  res.status(201).json({ ...row, caseName: null, clientName: null });
});

router.put("/communications/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { type, date, summary, createdBy } = req.body as Record<string, string>;
  const [row] = await db.update(communicationsTable).set({ type, date, summary, createdBy }).where(eq(communicationsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json({ ...row, caseName: null, clientName: null });
});

router.delete("/communications/:id", requireAuth, async (req, res) => {
  await db.delete(communicationsTable).where(eq(communicationsTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
