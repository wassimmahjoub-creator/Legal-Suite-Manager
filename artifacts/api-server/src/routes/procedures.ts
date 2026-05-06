import { Router } from "express";
import { db, proceduresTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/cases/:caseId/procedures", requireAuth, async (req, res) => {
  const caseId = Number(req.params.caseId);
  const rows = await db.select().from(proceduresTable).where(eq(proceduresTable.caseId, caseId)).orderBy(proceduresTable.startedAt);
  res.json(rows);
});

router.post("/cases/:caseId/procedures", requireAuth, async (req, res): Promise<void> => {
  const caseId = Number(req.params.caseId);
  const { stage, status, notes, startedAt, endedAt } = req.body as Record<string, string>;
  if (!stage) { res.status(400).json({ error: "المرحلة مطلوبة" }); return; }
  const [row] = await db.insert(proceduresTable).values({
    caseId, stage, status: status ?? "جارية",
    notes: notes ?? null, startedAt: startedAt ?? null, endedAt: endedAt ?? null,
  }).returning();
  res.status(201).json(row);
});

router.put("/procedures/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { stage, status, notes, startedAt, endedAt } = req.body as Record<string, string>;
  const [row] = await db.update(proceduresTable).set({ stage, status, notes, startedAt, endedAt }).where(eq(proceduresTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json(row);
});

router.delete("/procedures/:id", requireAuth, async (req, res) => {
  await db.delete(proceduresTable).where(eq(proceduresTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
