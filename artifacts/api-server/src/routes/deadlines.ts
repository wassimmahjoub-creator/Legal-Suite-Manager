import { Router } from "express";
import { db, deadlinesTable, casesTable } from "@workspace/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { requireAuth, getActor } from "../middleware/auth.js";

const router = Router();

const DEADLINE_RULES: Record<string, { days: number; urgency: string; label: string }> = {
  appeal: { days: 30, urgency: "critical", label: "أجل الاستئناف" },
  cassation: { days: 60, urgency: "critical", label: "أجل التعقيب" },
  execution: { days: 15, urgency: "high", label: "أجل التنفيذ" },
  response: { days: 20, urgency: "high", label: "أجل الرد" },
  custom: { days: 0, urgency: "normal", label: "أجل مخصص" },
};

router.get("/deadlines", requireAuth, async (req, res) => {
  const orgId = getActor(req).orgId ?? 0;
  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));
  const rows = await db
    .select({
      id: deadlinesTable.id,
      caseId: deadlinesTable.caseId,
      caseName: casesTable.title,
      title: deadlinesTable.title,
      type: deadlinesTable.type,
      dueDate: deadlinesTable.dueDate,
      urgency: deadlinesTable.urgency,
      notes: deadlinesTable.notes,
      completedAt: deadlinesTable.completedAt,
      createdAt: deadlinesTable.createdAt,
    })
    .from(deadlinesTable)
    .leftJoin(casesTable, eq(deadlinesTable.caseId, casesTable.id))
    .where(inArray(deadlinesTable.caseId, orgCases))
    .orderBy(deadlinesTable.dueDate);
  res.json(rows);
});

router.get("/cases/:caseId/deadlines", requireAuth, async (req, res) => {
  const caseId = Number(req.params.caseId);
  const rows = await db.select().from(deadlinesTable).where(eq(deadlinesTable.caseId, caseId)).orderBy(deadlinesTable.dueDate);
  res.json(rows);
});

router.get("/deadlines/upcoming", requireAuth, async (req, res) => {
  const orgId = getActor(req).orgId ?? 0;
  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));
  const rows = await db.select().from(deadlinesTable)
    .where(and(isNull(deadlinesTable.completedAt), inArray(deadlinesTable.caseId, orgCases)))
    .orderBy(deadlinesTable.dueDate);
  res.json(rows.slice(0, 20));
});

router.post("/cases/:caseId/deadlines", requireAuth, async (req, res) => {
  const caseId = Number(req.params.caseId);
  const { title, type, dueDate, reminderDate, urgency, notes } = req.body as Record<string, string>;

  let computedDueDate = dueDate;
  let computedUrgency = urgency ?? "normal";
  let computedTitle = title;

  if (type && type !== "custom" && !dueDate) {
    const rule = DEADLINE_RULES[type];
    if (rule) {
      const d = new Date();
      d.setDate(d.getDate() + rule.days);
      computedDueDate = d.toISOString().slice(0, 10);
      computedUrgency = rule.urgency;
      computedTitle = title || rule.label;
    }
  }

  const reminder = reminderDate ?? (() => {
    if (computedDueDate) {
      const d = new Date(computedDueDate);
      d.setDate(d.getDate() - 7);
      return d.toISOString().slice(0, 10);
    }
    return null;
  })();

  const [row] = await db.insert(deadlinesTable).values({
    caseId, title: computedTitle, type: type ?? "custom",
    dueDate: computedDueDate, reminderDate: reminder as string | null,
    urgency: computedUrgency, notes: notes ?? null,
  }).returning();
  res.status(201).json(row);
});

router.put("/deadlines/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const orgId = getActor(req).orgId ?? 0;
  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));
  const [own] = await db.select({ id: deadlinesTable.id }).from(deadlinesTable)
    .where(and(eq(deadlinesTable.id, id), inArray(deadlinesTable.caseId, orgCases)));
  if (!own) { res.status(404).json({ error: "غير موجود" }); return; }
  const { title, type, dueDate, urgency, notes } = req.body;
  const [row] = await db.update(deadlinesTable).set({
    ...(title     !== undefined && { title }),
    ...(type      !== undefined && { type }),
    ...(dueDate   !== undefined && { dueDate: dueDate || null }),
    ...(urgency   !== undefined && { urgency }),
    ...(notes     !== undefined && { notes: notes || null }),
  }).where(eq(deadlinesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json(row);
});

router.patch("/deadlines/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const orgId = getActor(req).orgId ?? 0;
  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));
  const [own] = await db.select({ id: deadlinesTable.id }).from(deadlinesTable)
    .where(and(eq(deadlinesTable.id, id), inArray(deadlinesTable.caseId, orgCases)));
  if (!own) { res.status(404).json({ error: "غير موجود" }); return; }
  const [row] = await db.update(deadlinesTable).set({ completedAt: new Date() }).where(eq(deadlinesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json(row);
});

router.delete("/deadlines/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const orgId = getActor(req).orgId ?? 0;
  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));
  const [own] = await db.select({ id: deadlinesTable.id }).from(deadlinesTable)
    .where(and(eq(deadlinesTable.id, id), inArray(deadlinesTable.caseId, orgCases)));
  if (!own) { res.status(404).json({ error: "غير موجود" }); return; }
  await db.delete(deadlinesTable).where(eq(deadlinesTable.id, id));
  res.status(204).send();
});

export default router;
