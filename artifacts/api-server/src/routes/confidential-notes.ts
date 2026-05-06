import { Router } from "express";
import { db, confidentialNotesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/cases/:caseId/confidential-notes", requireAuth, async (req, res) => {
  const caseId = Number(req.params.caseId);
  const rows = await db.select().from(confidentialNotesTable).where(eq(confidentialNotesTable.caseId, caseId)).orderBy(confidentialNotesTable.createdAt);
  res.json(rows.reverse());
});

router.post("/cases/:caseId/confidential-notes", requireAuth, async (req, res): Promise<void> => {
  const caseId = Number(req.params.caseId);
  const { content, createdBy } = req.body as Record<string, string>;
  if (!content?.trim()) { res.status(400).json({ error: "المحتوى مطلوب" }); return; }
  const [row] = await db.insert(confidentialNotesTable).values({ caseId, content, createdBy: createdBy ?? null }).returning();
  res.status(201).json(row);
});

router.delete("/confidential-notes/:id", requireAuth, async (req, res) => {
  await db.delete(confidentialNotesTable).where(eq(confidentialNotesTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
