import { Router } from "express";
import { db, caseStagesTable, legalDeadlinesTable, casesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CaseEventLogger } from "../services/caseEventLogger.js";

const router = Router();

const STAGE_LABELS: Record<string, string> = {
  first_instance: "ابتدائي",
  appeal: "استئنافي",
  cassation: "تعقيبي",
  execution: "تنفيذي",
};

router.get("/cases/:caseId/stages", async (req, res) => {
  const caseId = Number(req.params.caseId);
  const stages = await db
    .select()
    .from(caseStagesTable)
    .where(eq(caseStagesTable.caseId, caseId))
    .orderBy(caseStagesTable.enteredAt);
  res.json(stages);
});

router.get("/cases/:caseId/legal-deadlines", async (req, res) => {
  const caseId = Number(req.params.caseId);
  const deadlines = await db
    .select()
    .from(legalDeadlinesTable)
    .where(eq(legalDeadlinesTable.caseId, caseId))
    .orderBy(legalDeadlinesTable.endDate);
  res.json(deadlines);
});

router.patch("/case-stages/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const b = req.body as Record<string, unknown>;
  const set: Record<string, unknown> = {};
  if ("notes"           in b) set["notes"]           = b["notes"] || null;
  if ("executionStatus" in b) set["executionStatus"] = b["executionStatus"] || null;
  if ("executionNotes"  in b) set["executionNotes"]  = b["executionNotes"] || null;
  if ("courtId"         in b) set["courtId"]         = b["courtId"] ? Number(b["courtId"]) : null;
  if ("courtCaseNumber" in b) set["courtCaseNumber"] = b["courtCaseNumber"] || null;
  if (Object.keys(set).length === 0) { res.status(400).json({ error: "No fields" }); return; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [row] = await db.update(caseStagesTable).set(set as any).where(eq(caseStagesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.patch("/legal-deadlines/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const b = req.body as Record<string, unknown>;
  const set: Record<string, unknown> = {};
  if ("isCompleted" in b) {
    set["isCompleted"] = Boolean(b["isCompleted"]);
    set["completedAt"] = b["isCompleted"] ? new Date() : null;
  }
  if ("completedNotes"     in b) set["completedNotes"]     = b["completedNotes"] || null;
  if ("nameAr"             in b) set["nameAr"]             = b["nameAr"];
  if ("reminderDaysBefore" in b) set["reminderDaysBefore"] = Number(b["reminderDaysBefore"]);
  if ("durationDays"       in b) set["durationDays"]       = Number(b["durationDays"]);
  if ("startDate"          in b) {
    set["startDate"] = b["startDate"];
    const days = Number(b["durationDays"] ?? b["duration_days"]);
    if (!isNaN(days) && days > 0) {
      const sd = new Date(b["startDate"] as string);
      sd.setDate(sd.getDate() + days);
      set["endDate"] = sd.toISOString().slice(0, 10);
    }
  }
  if (Object.keys(set).length === 0) { res.status(400).json({ error: "No fields" }); return; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [row] = await db.update(legalDeadlinesTable).set(set as any).where(eq(legalDeadlinesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.post("/cases/:caseId/stages/transition", async (req, res): Promise<void> => {
  const caseId = Number(req.params.caseId);
  const user = (req as typeof req & { user?: { id: number } }).user;
  const {
    currentStageId,
    decisionDate,
    decisionOutcome,
    decisionSummary,
    nextStage,
    nextCourtId,
    nextCourtCaseNumber,
    executionNotes,
    deadlines,
  } = req.body as {
    currentStageId: number;
    decisionDate: string;
    decisionOutcome: string;
    decisionSummary?: string;
    nextStage: string;
    nextCourtId?: number;
    nextCourtCaseNumber?: string;
    executionNotes?: string;
    deadlines: Array<{
      nameAr: string;
      deadlineType: string;
      startDate: string;
      durationDays: number;
      reminderDaysBefore: number;
    }>;
  };

  if (!currentStageId || !decisionDate || !decisionOutcome || !nextStage) {
    res.status(400).json({ error: "المعطيات ناقصة" });
    return;
  }

  const [currentStage] = await db
    .select()
    .from(caseStagesTable)
    .where(and(eq(caseStagesTable.id, Number(currentStageId)), eq(caseStagesTable.caseId, caseId)));
  if (!currentStage) { res.status(404).json({ error: "الطور الحالي غير موجود" }); return; }
  if (currentStage.exitedAt) { res.status(400).json({ error: "الطور الحالي منتهٍ بالفعل" }); return; }

  await db.update(caseStagesTable).set({
    exitedAt: new Date(),
    decisionDate: decisionDate || null,
    decisionSummary: decisionSummary || null,
    decisionOutcome: decisionOutcome || null,
  }).where(eq(caseStagesTable.id, Number(currentStageId)));

  const [newStage] = await db.insert(caseStagesTable).values({
    caseId,
    stage: nextStage,
    enteredAt: new Date(),
    courtId: nextCourtId ? Number(nextCourtId) : null,
    courtCaseNumber: nextCourtCaseNumber || null,
    executionNotes: executionNotes || null,
    createdBy: user?.id ?? null,
  }).returning();

  const insertedDeadlines = [];
  for (const dl of (deadlines ?? [])) {
    const sd = new Date(dl.startDate);
    sd.setDate(sd.getDate() + Number(dl.durationDays));
    const endDate = sd.toISOString().slice(0, 10);
    const [ins] = await db.insert(legalDeadlinesTable).values({
      caseId,
      caseStageId: newStage.id,
      deadlineType: dl.deadlineType || "custom",
      nameAr: dl.nameAr,
      startDate: dl.startDate,
      durationDays: Number(dl.durationDays),
      endDate,
      reminderDaysBefore: dl.reminderDaysBefore ?? 7,
      createdBy: user?.id ?? null,
    }).returning();
    insertedDeadlines.push(ins);
  }

  await db.update(casesTable).set({ litigationDegree: nextStage }).where(eq(casesTable.id, caseId));

  void CaseEventLogger.log({
    caseId, eventType: "judgment_recorded", actorUserId: user?.id ?? null,
    metadata: { outcome: decisionOutcome, summary: decisionSummary ?? "", stage: STAGE_LABELS[currentStage.stage] ?? currentStage.stage },
  });
  void CaseEventLogger.log({
    caseId, eventType: "stage_transitioned", actorUserId: user?.id ?? null,
    metadata: {
      from_stage: currentStage.stage, from_stage_ar: STAGE_LABELS[currentStage.stage] ?? currentStage.stage,
      to_stage: nextStage, new_stage_ar: STAGE_LABELS[nextStage] ?? nextStage, outcome: decisionOutcome,
    },
  });
  for (const dl of insertedDeadlines) {
    void CaseEventLogger.log({
      caseId, eventType: "legal_deadline_added", actorUserId: user?.id ?? null,
      metadata: { deadline_name: dl.nameAr, end_date: dl.endDate },
    });
  }

  res.json({ newStage, deadlines: insertedDeadlines });
});

export default router;
