import { Router } from "express";
import { db, conflictChecksTable, casesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { ConflictDetectionService } from "../services/conflictDetection.js";
import type { AuthPayload } from "../middleware/auth.js";

const router = Router();

router.get("/conflict-checks/stats", requireAuth, async (_req, res) => {
  const all = await db
    .select({ resolved: conflictChecksTable.resolved, detectedAt: conflictChecksTable.detectedAt })
    .from(conflictChecksTable);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  res.json({
    unresolvedTotal: all.filter((r) => !r.resolved).length,
    resolvedThisMonth: all.filter((r) => r.resolved && new Date(r.detectedAt) >= monthStart).length,
    total: all.length,
  });
});

router.get("/conflict-checks", requireAuth, async (req, res) => {
  const { resolved, caseId, entityId, entityType } = req.query as Record<string, string>;

  let rows = await db
    .select({
      id: conflictChecksTable.id,
      caseId: conflictChecksTable.caseId,
      caseName: casesTable.title,
      caseNumber: casesTable.caseNumber,
      conflictType: conflictChecksTable.conflictType,
      conflictingEntityType: conflictChecksTable.conflictingEntityType,
      conflictingEntityId: conflictChecksTable.conflictingEntityId,
      conflictingEntityName: conflictChecksTable.conflictingEntityName,
      matchedOn: conflictChecksTable.matchedOn,
      matchScore: conflictChecksTable.matchScore,
      otherCaseId: conflictChecksTable.otherCaseId,
      otherCaseName: conflictChecksTable.otherCaseName,
      detectedAt: conflictChecksTable.detectedAt,
      resolved: conflictChecksTable.resolved,
      resolvedAt: conflictChecksTable.resolvedAt,
      resolvedBy: conflictChecksTable.resolvedBy,
      resolutionJustification: conflictChecksTable.resolutionJustification,
    })
    .from(conflictChecksTable)
    .leftJoin(casesTable, eq(conflictChecksTable.caseId, casesTable.id))
    .orderBy(desc(conflictChecksTable.detectedAt));

  if (resolved === "true") rows = rows.filter((r) => r.resolved);
  if (resolved === "false") rows = rows.filter((r) => !r.resolved);
  if (caseId) rows = rows.filter((r) => r.caseId === Number(caseId));
  if (entityId && entityType)
    rows = rows.filter(
      (r) => r.conflictingEntityId === Number(entityId) && r.conflictingEntityType === entityType
    );

  res.json(rows);
});

router.post("/conflict-checks/detect/:caseId", requireAuth, async (req, res) => {
  const caseId = Number(req.params.caseId);
  const actor = (req as typeof req & { user?: AuthPayload }).user;
  const conflicts = await ConflictDetectionService.detectAndStore(caseId, actor?.id ?? null);
  res.json({ conflicts });
});

router.post("/conflict-checks/backfill", requireAuth, async (req, res) => {
  const actor = (req as typeof req & { user?: AuthPayload }).user;
  const results = await ConflictDetectionService.backfillAll(actor?.id ?? null);
  res.json({ processed: results.length, results });
});

router.patch("/conflict-checks/resolve-case/:caseId", requireAuth, async (req, res): Promise<void> => {
  const caseId = Number(req.params.caseId);
  const { justification } = req.body as { justification: string };
  if (!justification || justification.trim().length < 30) {
    res.status(400).json({ error: "التبرير يجب أن يكون 30 حرفاً على الأقل" });
    return;
  }
  const actor = (req as typeof req & { user?: AuthPayload }).user;
  const count = await ConflictDetectionService.resolveAll(caseId, justification.trim(), actor?.id ?? null);
  res.json({ resolved: count });
});

router.patch("/conflict-checks/:id/resolve", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { justification } = req.body as { justification: string };
  if (!justification || justification.trim().length < 30) {
    res.status(400).json({ error: "التبرير يجب أن يكون 30 حرفاً على الأقل" });
    return;
  }
  const actor = (req as typeof req & { user?: AuthPayload }).user;
  const [row] = await db
    .update(conflictChecksTable)
    .set({
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: actor?.id ?? null,
      resolutionJustification: justification.trim(),
    })
    .where(eq(conflictChecksTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json(row);
});

export default router;
