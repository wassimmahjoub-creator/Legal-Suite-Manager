import { Router } from "express";
import {
  db, casesTable, clientsTable,
  contractsTable, contractVersionsTable,
  debtRecoveryFilesTable, debtRecoveryPaymentsTable,
  companyFilesTable, companyCreationStepsTable,
} from "@workspace/db";
import { eq, isNull, isNotNull, like, sql, inArray, and, or } from "drizzle-orm";
import { CreateCaseBody, UpdateCaseBody } from "@workspace/api-zod";
import { CaseEventLogger } from "../services/caseEventLogger.js";
import { getActor } from "../middleware/auth.js";

const router = Router();

const caseFields = {
  id: casesTable.id,
  caseNumber: casesTable.caseNumber,
  courtCaseNumber: casesTable.courtCaseNumber,
  clientFileRef: casesTable.clientFileRef,
  officeRef: casesTable.officeRef,
  title: casesTable.title,
  clientId: casesTable.clientId,
  clientName: clientsTable.name,
  status: casesTable.status,
  court: casesTable.court,
  division: casesTable.division,
  lawyer: casesTable.lawyer,
  nextHearing: casesTable.nextHearing,
  opponentName: casesTable.opponentName,
  opponentLawyer: casesTable.opponentLawyer,
  judgmentText: casesTable.judgmentText,
  description: casesTable.description,
  notes: casesTable.notes,
  procedureStage: casesTable.procedureStage,
  // Wizard fields
  caseType: casesTable.caseType,
  litigationDegree: casesTable.litigationDegree,
  procedureType: casesTable.procedureType,
  casePriority: casesTable.casePriority,
  feeMethod: casesTable.feeMethod,
  agreedFees: casesTable.agreedFees,
  hourlyRate: casesTable.hourlyRate,
  percentage: casesTable.percentage,
  percentageBasis: casesTable.percentageBasis,
  disputeValue: casesTable.disputeValue,
  clientSource: casesTable.clientSource,
  judgeName: casesTable.judgeName,
  firstHearingDate: casesTable.firstHearingDate,
  openedAt: casesTable.openedAt,
  confidentialityLevel: casesTable.confidentialityLevel,
  internalNotes: casesTable.internalNotes,
  draftLastStep: casesTable.draftLastStep,
  archivedAt: casesTable.archivedAt,
  deletedAt: casesTable.deletedAt,
  createdAt: casesTable.createdAt,
  // Multi-type file fields
  serviceType: casesTable.serviceType,
  typeSpecificData: casesTable.typeSpecificData,
};

function extractExtras(body: Record<string, unknown>) {
  const str = (key: string) => typeof body[key] === "string" ? (body[key] as string) || null : null;
  return {
    courtCaseNumber: str("courtCaseNumber"),
    clientFileRef: str("clientFileRef"),
    officeRef: str("officeRef"),
    opponentName: str("opponentName"),
    opponentLawyer: str("opponentLawyer"),
    judgmentText: str("judgmentText"),
    // Wizard fields
    caseType: str("caseType"),
    litigationDegree: str("litigationDegree"),
    procedureType: str("procedureType"),
    casePriority: str("casePriority"),
    feeMethod: str("feeMethod"),
    agreedFees: str("agreedFees"),
    hourlyRate: str("hourlyRate"),
    percentage: str("percentage"),
    percentageBasis: str("percentageBasis"),
    disputeValue: str("disputeValue"),
    clientSource: str("clientSource"),
    judgeName: str("judgeName"),
    firstHearingDate: str("firstHearingDate"),
    openedAt: str("openedAt"),
    confidentialityLevel: str("confidentialityLevel"),
    internalNotes: str("internalNotes"),
    draftData: str("draftData"),
    draftLastStep: typeof body["draftLastStep"] === "number" ? body["draftLastStep"] as number : undefined,
  };
}

router.get("/cases", async (req, res) => {
  const { status, court, clientId, search, archived, userId } = req.query as Record<string, string>;
  const page  = Math.max(0, parseInt((req.query.page  as string) ?? "0") || 0);
  const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) ?? "50") || 50));

  const actor = (req as typeof req & { user: { orgId?: number } }).user;
  const conditions: ReturnType<typeof isNull>[] = [
    isNull(casesTable.deletedAt),
    eq(casesTable.orgId, actor.orgId ?? 0) as any,
  ];

  if (archived === "true")       conditions.push(isNotNull(casesTable.archivedAt) as any);
  else if (archived !== "all")   conditions.push(isNull(casesTable.archivedAt));
  if (status)   conditions.push(eq(casesTable.status,   status)          as any);
  if (court)    conditions.push(eq(casesTable.court,    court)           as any);
  if (clientId) conditions.push(eq(casesTable.clientId, Number(clientId)) as any);

  if (userId) {
    const { caseTeamsTable } = await import("@workspace/db");
    const teamRows = await db
      .select({ caseId: caseTeamsTable.caseId })
      .from(caseTeamsTable)
      .where(eq(caseTeamsTable.userId, Number(userId)));
    if (teamRows.length === 0) return res.json([]);
    conditions.push(inArray(casesTable.id, teamRows.map((r) => r.caseId)) as any);
  }

  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        like(casesTable.title,          term),
        like(casesTable.caseNumber,     term),
        like(casesTable.courtCaseNumber,term),
        like(clientsTable.name,         term)
      ) as any
    );
  }

  const rows = await db
    .select(caseFields)
    .from(casesTable)
    .leftJoin(clientsTable, eq(casesTable.clientId, clientsTable.id))
    .where(and(...conditions))
    .orderBy(casesTable.createdAt)
    .limit(limit)
    .offset(page * limit);

  res.json(rows);
});

router.post("/cases", async (req, res): Promise<void> => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const actor = getActor(req);
  const orgId = actor.orgId ?? 0;
  const year  = new Date().getFullYear();
  const { caseStagesTable } = await import("@workspace/db");

  let newCase: typeof casesTable.$inferSelect;
  let clientName = "";

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Numéro de dossier — dans la transaction pour éviter les doublons sous charge
      const [count] = await tx
        .select({ cnt: sql<number>`count(*)::int` })
        .from(casesTable)
        .where(and(eq(casesTable.orgId, orgId), like(casesTable.caseNumber, `${year}-%`)));
      const caseNumber = `${year}-${String((count?.cnt ?? 0) + 1).padStart(4, "0")}`;

      // 2. Créer le dossier avec orgId
      const extras = extractExtras(req.body as Record<string, unknown>);
      const [created] = await tx.insert(casesTable).values({
        ...parsed.data, caseNumber, orgId, ...extras,
      }).returning();

      // 3. Créer le stage initial — atomique avec le dossier
      const initialStage = (extras.litigationDegree as string) || "first_instance";
      await tx.insert(caseStagesTable).values({
        caseId: created.id,
        stage: initialStage,
        enteredAt: created.openedAt ? new Date(created.openedAt) : created.createdAt,
        createdBy: actor.id ?? null,
      });

      // 4. Nom du client (lecture seule, dans la même tx)
      const [client] = await tx
        .select({ name: clientsTable.name })
        .from(clientsTable)
        .where(eq(clientsTable.id, created.clientId));

      return { created, clientName: client?.name ?? "" };
    });

    newCase    = result.created;
    clientName = result.clientName;
  } catch (err) {
    console.error("[POST /cases] transaction failed:", err);
    res.status(500).json({ error: "فشل إنشاء الملف. يرجى المحاولة مجدداً." });
    return;
  }

  // Logging en dehors de la transaction : non-critique, ne doit pas bloquer
  void CaseEventLogger.log({
    caseId: newCase.id,
    eventType: "case_filed",
    occurredAt: newCase.openedAt ? new Date(newCase.openedAt) : newCase.createdAt,
    actorUserId: actor.id ?? null,
  });

  res.status(201).json({ ...newCase, clientName });
});

router.get("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const [row] = await db
    .select(caseFields)
    .from(casesTable)
    .leftJoin(clientsTable, eq(casesTable.clientId, clientsTable.id))
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0)));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.put("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const extras = extractExtras(req.body as Record<string, unknown>);
  const [row] = await db.update(casesTable).set({ ...parsed.data, ...extras })
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0))).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));
  res.json({ ...row, clientName: client?.name ?? "" });
});

// Partial update — used by wizard, CaseDetail tabs, draft saves
router.patch("/cases/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { id: number; orgId?: number } }).user;
  const b = req.body as Record<string, unknown>;

  const set: Record<string, unknown> = {};
  const strFields = [
    "status", "title", "court", "division", "lawyer", "notes", "description",
    "procedureStage", "courtCaseNumber", "clientFileRef", "officeRef",
    "opponentName", "opponentLawyer", "judgmentText",
    "caseType", "litigationDegree", "procedureType", "casePriority",
    "feeMethod", "agreedFees", "hourlyRate", "percentage", "percentageBasis",
    "disputeValue", "clientSource", "judgeName", "firstHearingDate", "openedAt",
    "confidentialityLevel", "internalNotes", "draftData",
  ];
  for (const f of strFields) {
    if (f in b) set[f] = b[f] !== undefined ? b[f] : null;
  }
  if ("clientId" in b) set["clientId"] = Number(b["clientId"]);
  if ("draftLastStep" in b) set["draftLastStep"] = Number(b["draftLastStep"]);
  if ("nextHearing" in b) set["nextHearing"] = b["nextHearing"] ?? null;

  if (Object.keys(set).length === 0) { res.status(400).json({ error: "No fields" }); return; }

  // Fetch before for case_updated diff
  const [before] = await db.select().from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [row] = await db.update(casesTable).set(set as any)
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  if (before) {
    const watchedFields = ["title", "caseType", "litigationDegree", "procedureType", "feeMethod", "disputeValue", "agreedFees", "confidentialityLevel"] as const;
    const changed = watchedFields.filter(f => f in set && String((before as Record<string, unknown>)[f] ?? "") !== String(set[f] ?? ""));
    if (changed.length > 0) {
      void CaseEventLogger.log({ caseId: id, eventType: "case_updated", actorUserId: actor?.id ?? null, metadata: { changed_fields: changed } });
    }
  }

  res.json(row);
});

router.patch("/cases/:id/archive", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { id: number; orgId?: number } }).user;
  const [row] = await db.select().from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const archivedAt = row.archivedAt ? null : new Date();
  await db.update(casesTable).set({ archivedAt, status: archivedAt ? "archived" : "active" })
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0)));
  void CaseEventLogger.log({ caseId: id, eventType: archivedAt ? "case_archived" : "case_reopened", actorUserId: actor?.id ?? null });
  res.json({ archived: !!archivedAt });
});

router.patch("/cases/:id/soft-delete", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  await db.update(casesTable).set({ deletedAt: new Date() })
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0)));
  res.json({ deleted: true });
});

router.delete("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  await db.delete(casesTable).where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0)));
  res.status(204).send();
});

// ── Contract routes ──────────────────────────────────────────────────────────
router.get("/cases/:id/contract", async (req, res) => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const [cas] = await db.select({ id: casesTable.id }).from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0)));
  if (!cas) return res.status(404).json({ error: "Not found" });
  const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.caseId, id));
  if (!contract) return res.json(null);
  const versions = await db.select().from(contractVersionsTable)
    .where(eq(contractVersionsTable.contractId, contract.id))
    .orderBy(contractVersionsTable.versionNumber);
  res.json({ ...contract, versions });
});

router.put("/cases/:id/contract", async (req, res) => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const [cas] = await db.select({ id: casesTable.id }).from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0)));
  if (!cas) return res.status(404).json({ error: "Not found" });
  const b = req.body as Record<string, unknown>;
  const [existing] = await db.select().from(contractsTable).where(eq(contractsTable.caseId, id));
  let result;
  if (existing) {
    [result] = await db.update(contractsTable).set({
      contractType: (b.contractType as string | undefined) ?? existing.contractType,
      status: (b.status as string | undefined) ?? existing.status,
      partyOneName: (b.partyOneName as string | null | undefined) ?? existing.partyOneName,
      partyTwoName: (b.partyTwoName as string | null | undefined) ?? existing.partyTwoName,
      contractValue: (b.contractValue as string | null | undefined) ?? existing.contractValue,
      startDate: (b.startDate as string | null | undefined) ?? existing.startDate,
      endDate: (b.endDate as string | null | undefined) ?? existing.endDate,
      signingDate: (b.signingDate as string | null | undefined) ?? existing.signingDate,
      notes: (b.notes as string | null | undefined) ?? existing.notes,
      updatedAt: new Date(),
    }).where(eq(contractsTable.id, existing.id)).returning();
  } else {
    [result] = await db.insert(contractsTable).values({
      caseId: id,
      contractType: (b.contractType as "sale" | "rental" | "service" | "employment" | "partnership" | "loan" | "guarantee" | "agency" | "franchise" | "other" | undefined) ?? "other",
      status: (b.status as "draft" | "under_review" | "ready_to_sign" | "signed" | "expired" | "terminated" | undefined) ?? "draft",
      partyOneName: (b.partyOneName as string) ?? null,
      partyTwoName: (b.partyTwoName as string) ?? null,
      contractValue: (b.contractValue as string) ?? null,
      startDate: (b.startDate as string) ?? null,
      endDate: (b.endDate as string) ?? null,
      signingDate: (b.signingDate as string) ?? null,
      notes: (b.notes as string) ?? null,
    }).returning();
  }
  res.json(result);
});

// ── Debt recovery routes ─────────────────────────────────────────────────────
router.get("/cases/:id/debt-recovery", async (req, res) => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const [cas] = await db.select({ id: casesTable.id }).from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0)));
  if (!cas) return res.status(404).json({ error: "Not found" });
  const [debtFile] = await db.select().from(debtRecoveryFilesTable).where(eq(debtRecoveryFilesTable.caseId, id));
  if (!debtFile) return res.json(null);
  const payments = await db.select().from(debtRecoveryPaymentsTable)
    .where(eq(debtRecoveryPaymentsTable.debtRecoveryFileId, debtFile.id))
    .orderBy(debtRecoveryPaymentsTable.receivedAt);
  res.json({ ...debtFile, payments });
});

router.put("/cases/:id/debt-recovery", async (req, res) => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const [cas] = await db.select({ id: casesTable.id }).from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0)));
  if (!cas) return res.status(404).json({ error: "Not found" });
  const b = req.body as Record<string, unknown>;
  const [existing] = await db.select().from(debtRecoveryFilesTable).where(eq(debtRecoveryFilesTable.caseId, id));
  let result;
  if (existing) {
    [result] = await db.update(debtRecoveryFilesTable).set({
      debtorName: (b.debtorName as string | undefined) ?? existing.debtorName,
      debtAmount: (b.debtAmount as string | undefined) ?? existing.debtAmount,
      currentStage: (b.currentStage as string | undefined) ?? existing.currentStage,
      dueDate: (b.dueDate as string | null | undefined) ?? existing.dueDate,
      notes: (b.notes as string | null | undefined) ?? existing.notes,
      updatedAt: new Date(),
    }).where(eq(debtRecoveryFilesTable.id, existing.id)).returning();
  } else {
    [result] = await db.insert(debtRecoveryFilesTable).values({
      caseId: id,
      debtorName: (b.debtorName as string) ?? "مجهول",
      debtAmount: String(b.debtAmount ?? "0"),
      currentStage: (b.currentStage as "notice" | "negotiation" | "lawsuit" | "execution" | "completed" | undefined) ?? "notice",
      dueDate: (b.dueDate as string) ?? null,
      notes: (b.notes as string) ?? null,
    }).returning();
  }
  res.json(result);
});

router.post("/cases/:id/debt-recovery/payments", async (req, res) => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const [cas] = await db.select({ id: casesTable.id }).from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0)));
  if (!cas) return res.status(404).json({ error: "Not found" });
  const [debtFile] = await db.select().from(debtRecoveryFilesTable).where(eq(debtRecoveryFilesTable.caseId, id));
  if (!debtFile) return res.status(404).json({ error: "No debt recovery file for this case" });
  const b = req.body as Record<string, unknown>;
  const [payment] = await db.insert(debtRecoveryPaymentsTable).values({
    debtRecoveryFileId: debtFile.id,
    amount: String(b.amount ?? "0"),
    paymentMethod: (b.paymentMethod as string) ?? null,
    reference: (b.reference as string) ?? null,
    receivedAt: b.receivedAt ? new Date(b.receivedAt as string) : new Date(),
    notes: (b.notes as string) ?? null,
  }).returning();
  // Recalculate recoveredAmount
  const allPayments = await db.select({ amount: debtRecoveryPaymentsTable.amount })
    .from(debtRecoveryPaymentsTable)
    .where(eq(debtRecoveryPaymentsTable.debtRecoveryFileId, debtFile.id));
  const recovered = allPayments.reduce((s, p) => s + Number(p.amount), 0);
  await db.update(debtRecoveryFilesTable).set({ recoveredAmount: String(recovered) })
    .where(eq(debtRecoveryFilesTable.id, debtFile.id));
  res.status(201).json(payment);
});

// ── Company creation routes ──────────────────────────────────────────────────
router.get("/cases/:id/company-creation", async (req, res) => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const [cas] = await db.select({ id: casesTable.id }).from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0)));
  if (!cas) return res.status(404).json({ error: "Not found" });
  const [companyFile] = await db.select().from(companyFilesTable).where(eq(companyFilesTable.caseId, id));
  if (!companyFile) return res.json(null);
  const steps = await db.select().from(companyCreationStepsTable)
    .where(eq(companyCreationStepsTable.companyFileId, companyFile.id))
    .orderBy(companyCreationStepsTable.stepOrder);
  res.json({ ...companyFile, steps });
});

router.patch("/cases/:id/company-creation/steps/:stepId", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const stepId = Number(req.params.stepId);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const [cas] = await db.select({ id: casesTable.id }).from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.orgId, actor?.orgId ?? 0)));
  if (!cas) { res.status(404).json({ error: "Not found" }); return; }
  const b = req.body as { isCompleted?: boolean };
  const isCompleted = b.isCompleted ? 1 : 0;
  const [step] = await db.update(companyCreationStepsTable).set({
    isCompleted,
    completedAt: isCompleted ? new Date() : null,
  }).where(eq(companyCreationStepsTable.id, stepId)).returning();
  if (!step) { res.status(404).json({ error: "Step not found" }); return; }
  res.json(step);
});

export default router;
