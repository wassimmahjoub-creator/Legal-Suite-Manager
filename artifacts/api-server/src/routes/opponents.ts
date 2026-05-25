import { Router } from "express";
import { db, opponentsTable, casesTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { requireAuth, getActor } from "../middleware/auth.js";
import { CaseEventLogger } from "../services/caseEventLogger.js";
import { ConflictDetectionService } from "../services/conflictDetection.js";
import type { AuthPayload } from "../middleware/auth.js";

const router = Router();

const withCase = () =>
  db.select({
    id: opponentsTable.id,
    name: opponentsTable.name,
    lawyerName: opponentsTable.lawyerName,
    phone: opponentsTable.phone,
    address: opponentsTable.address,
    notes: opponentsTable.notes,
    caseId: opponentsTable.caseId,
    caseName: casesTable.title,
    capacity: opponentsTable.capacity,
    opponentLawyerPhone: opponentsTable.opponentLawyerPhone,
    createdAt: opponentsTable.createdAt,
  })
  .from(opponentsTable)
  .leftJoin(casesTable, eq(opponentsTable.caseId, casesTable.id));

router.get("/opponents", requireAuth, async (req, res) => {
  const { caseId } = req.query as Record<string, string>;
  const orgId = getActor(req).orgId ?? 0;
  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));
  let rows = await withCase()
    .where(inArray(opponentsTable.caseId, orgCases))
    .orderBy(opponentsTable.createdAt);
  if (caseId) rows = rows.filter(r => r.caseId === Number(caseId));
  res.json(rows);
});

router.post("/opponents", requireAuth, async (req, res): Promise<void> => {
  const { name, lawyerName, phone, address, notes, caseId, capacity, opponentLawyerPhone } = req.body as Record<string, string>;
  if (!name) {
    res.status(400).json({ error: "الاسم مطلوب" });
    return;
  }
  if (caseId) {
    const orgId = getActor(req).orgId ?? 0;
    const [ownedCase] = await db.select({ id: casesTable.id })
      .from(casesTable)
      .where(and(eq(casesTable.id, Number(caseId)), eq(casesTable.orgId, orgId)));
    if (!ownedCase) { res.status(403).json({ error: "غير مصرّح" }); return; }
  }
  const [row] = await db.insert(opponentsTable).values({
    name,
    lawyerName: lawyerName ?? null,
    phone: phone ?? null,
    address: address ?? null,
    notes: notes ?? null,
    caseId: caseId ? Number(caseId) : null,
    capacity: capacity ?? null,
    opponentLawyerPhone: opponentLawyerPhone ?? null,
  }).returning();
  if (caseId) {
    const actor = (req as typeof req & { user?: AuthPayload }).user;
    void CaseEventLogger.log({
      caseId: Number(caseId), eventType: "opponent_added", actorUserId: actor?.id ?? null,
      metadata: { opponent_name: name, opponent_id: row.id },
      relatedEntityType: "opponent", relatedEntityId: row.id,
    });
    void ConflictDetectionService.detectAndStore(Number(caseId), actor?.id ?? null);
  }
  res.status(201).json({ ...row, caseName: null });
});

router.put("/opponents/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const orgId = getActor(req).orgId ?? 0;
  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));
  const [own] = await db.select({ id: opponentsTable.id }).from(opponentsTable)
    .where(and(eq(opponentsTable.id, id), inArray(opponentsTable.caseId, orgCases)));
  if (!own) { res.status(404).json({ error: "غير موجود" }); return; }
  const { name, lawyerName, phone, address, notes, caseId, capacity, opponentLawyerPhone } = req.body as Record<string, string>;
  const [row] = await db.update(opponentsTable).set({
    name,
    lawyerName: lawyerName ?? null,
    phone: phone ?? null,
    address: address ?? null,
    notes: notes ?? null,
    caseId: caseId ? Number(caseId) : null,
    capacity: capacity ?? null,
    opponentLawyerPhone: opponentLawyerPhone ?? null,
  }).where(eq(opponentsTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "غير موجود" });
    return;
  }
  res.json({ ...row, caseName: null });
});

router.delete("/opponents/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const actor = getActor(req);
  const orgId = actor.orgId ?? 0;
  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));
  const [own] = await db.select({ id: opponentsTable.id }).from(opponentsTable)
    .where(and(eq(opponentsTable.id, id), inArray(opponentsTable.caseId, orgCases)));
  if (!own) { res.status(404).json({ error: "غير موجود" }); return; }
  const [opp] = await db.select().from(opponentsTable).where(eq(opponentsTable.id, id));
  await db.delete(opponentsTable).where(eq(opponentsTable.id, id));
  if (opp?.caseId) {
    void CaseEventLogger.log({
      caseId: opp.caseId, eventType: "opponent_removed", actorUserId: actor.id ?? null,
      metadata: { opponent_name: opp.name },
    });
  }
  res.status(204).send();
});

export default router;
