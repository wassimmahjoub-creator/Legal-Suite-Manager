import { Router } from "express";
import { db, caseStagesTable, legalDeadlinesTable, casesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CaseEventLogger } from "../services/caseEventLogger.js";
import { getActor } from "../middleware/auth.js";

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
  const actor  = getActor(req);
  const {
    currentStageId, decisionDate, decisionOutcome, decisionSummary,
    nextStage, nextCourtId, nextCourtCaseNumber, executionNotes, deadlines,
  } = req.body as {
    currentStageId: number; decisionDate: string; decisionOutcome: string;
    decisionSummary?: string; nextStage: string; nextCourtId?: number;
    nextCourtCaseNumber?: string; executionNotes?: string;
    deadlines: Array<{
      nameAr: string; deadlineType: string; startDate: string;
      durationDays: number; reminderDaysBefore: number;
    }>;
  };

  if (!currentStageId || !decisionDate || !decisionOutcome || !nextStage) {
    res.status(400).json({ error: "المعطيات ناقصة" }); return;
  }

  // Vérification avant transaction (lecture seule)
  const [currentStage] = await db
    .select().from(caseStagesTable)
    .where(and(eq(caseStagesTable.id, Number(currentStageId)), eq(caseStagesTable.caseId, caseId)));
  if (!currentStage) { res.status(404).json({ error: "الطور الحالي غير موجود" }); return; }
  if (currentStage.exitedAt) { res.status(400).json({ error: "الطور الحالي منتهٍ بالفعل" }); return; }

  let newStage: typeof caseStagesTable.$inferSelect;
  let insertedDeadlines: typeof legalDeadlinesTable.$inferSelect[] = [];

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Clôturer le stage courant
      await tx.update(caseStagesTable).set({
        exitedAt: new Date(),
        decisionDate: decisionDate || null,
        decisionSummary: decisionSummary || null,
        decisionOutcome: decisionOutcome || null,
      }).where(eq(caseStagesTable.id, Number(currentStageId)));

      // 2. Créer le nouveau stage
      const [created] = await tx.insert(caseStagesTable).values({
        caseId, stage: nextStage, enteredAt: new Date(),
        courtId: nextCourtId ? Number(nextCourtId) : null,
        courtCaseNumber: nextCourtCaseNumber || null,
        executionNotes: executionNotes || null,
        createdBy: actor.id ?? null,
      }).returning();

      // 3. Bulk insert des délais (1 requête au lieu de N)
      let dlRows: typeof legalDeadlinesTable.$inferSelect[] = [];
      if (deadlines?.length > 0) {
        const dlValues = deadlines.map((dl) => {
          const end = new Date(dl.startDate);
          end.setDate(end.getDate() + Number(dl.durationDays));
          return {
            caseId, caseStageId: created.id,
            deadlineType: dl.deadlineType || "custom",
            nameAr: dl.nameAr, startDate: dl.startDate,
            durationDays: Number(dl.durationDays),
            endDate: end.toISOString().slice(0, 10),
            reminderDaysBefore: dl.reminderDaysBefore ?? 7,
            createdBy: actor.id ?? null,
          };
        });
        dlRows = await tx.insert(legalDeadlinesTable).values(dlValues).returning();
      }

      // 4. Mettre à jour le degré de litige sur le dossier
      await tx.update(casesTable)
        .set({ litigationDegree: nextStage })
        .where(eq(casesTable.id, caseId));

      return { newStage: created, deadlines: dlRows };
    });

    newStage          = result.newStage;
    insertedDeadlines = result.deadlines;
  } catch (err) {
    console.error("[stages/transition] transaction failed:", err);
    res.status(500).json({ error: "فشل تغيير الطور. يرجى المحاولة مجدداً." });
    return;
  }

  // Logs événements — hors transaction, non-bloquants
  void CaseEventLogger.log({
    caseId, eventType: "judgment_recorded", actorUserId: actor.id ?? null,
    metadata: { outcome: decisionOutcome, summary: decisionSummary ?? "",
      stage: STAGE_LABELS[currentStage.stage] ?? currentStage.stage },
  });
  void CaseEventLogger.log({
    caseId, eventType: "stage_transitioned", actorUserId: actor.id ?? null,
    metadata: {
      from_stage: currentStage.stage,
      from_stage_ar: STAGE_LABELS[currentStage.stage] ?? currentStage.stage,
      to_stage: nextStage,
      new_stage_ar: STAGE_LABELS[nextStage] ?? nextStage,
      outcome: decisionOutcome,
    },
  });
  for (const dl of insertedDeadlines) {
    void CaseEventLogger.log({
      caseId, eventType: "legal_deadline_added", actorUserId: actor.id ?? null,
      metadata: { deadline_name: dl.nameAr, end_date: dl.endDate },
    });
  }

  res.json({ newStage, deadlines: insertedDeadlines });
});

export default router;
