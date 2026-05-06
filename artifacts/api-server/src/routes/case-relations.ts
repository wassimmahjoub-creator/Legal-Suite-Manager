import { Router } from "express";
import { db, caseRelationsTable, casesTable, clientsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/cases/:caseId/relations", requireAuth, async (req, res) => {
  const caseId = Number(req.params.caseId);
  const rows = await db.select({
    id: caseRelationsTable.id,
    caseId: caseRelationsTable.caseId,
    relatedCaseId: caseRelationsTable.relatedCaseId,
    relationType: caseRelationsTable.relationType,
    relatedTitle: casesTable.title,
    relatedStatus: casesTable.status,
    relatedCourt: casesTable.court,
  }).from(caseRelationsTable)
    .leftJoin(casesTable, eq(caseRelationsTable.relatedCaseId, casesTable.id))
    .where(eq(caseRelationsTable.caseId, caseId));
  res.json(rows);
});

router.post("/cases/:caseId/relations", requireAuth, async (req, res): Promise<void> => {
  const caseId = Number(req.params.caseId);
  const { relatedCaseId, relationType } = req.body as Record<string, string>;
  if (!relatedCaseId) { res.status(400).json({ error: "القضية المرتبطة مطلوبة" }); return; }
  if (Number(relatedCaseId) === caseId) { res.status(400).json({ error: "لا يمكن ربط القضية بنفسها" }); return; }
  const [row] = await db.insert(caseRelationsTable).values({ caseId, relatedCaseId: Number(relatedCaseId), relationType: relationType ?? "مرتبطة" }).returning();
  res.status(201).json({ ...row, relatedTitle: null, relatedStatus: null });
});

router.delete("/case-relations/:id", requireAuth, async (req, res) => {
  await db.delete(caseRelationsTable).where(eq(caseRelationsTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
