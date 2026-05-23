import { Router } from "express";
import { db, casesTable, clientsTable } from "@workspace/db";
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
  serviceType: casesTable.serviceType,
  typeSpecificData: casesTable.typeSpecificData,
  archivedAt: casesTable.archivedAt,
  deletedAt: casesTable.deletedAt,
  createdAt: casesTable.createdAt,
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
  const { status, court, clientId, search, archived, userId, serviceType } = req.query as Record<string, string>;
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

  if (serviceType && serviceType !== "all") {
    const OTHER = ["real_estate_file","labor_file","tax_file","administrative","mediation","other"];
    if (serviceType === "other_group") {
      conditions.push(inArray(casesTable.serviceType as any, OTHER) as any);
    } else {
      conditions.push(eq(casesTable.serviceType as any, serviceType) as any);
    }
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
        serviceType: (req.body.serviceType as string) || "lawsuit",
        typeSpecificData: req.body.typeSpecificData || {},
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

// ── POST /contracts ──────────────────────────────────────────────────────
router.post("/contracts", async (req, res) => {
  try {
    const { contractsTable } = await import("@workspace/db");
    const [row] = await db.insert(contractsTable).values({
      caseId:          req.body.caseId,
      contractType:    req.body.contractType   ?? "other",
      partyOneName:    req.body.partyOneName   ?? null,
      partyOneTaxId:   req.body.partyOneTaxId  ?? null,
      partyTwoName:    req.body.partyTwoName   ?? null,
      partyTwoTaxId:   req.body.partyTwoTaxId  ?? null,
      contractValue:   req.body.contractValue  ?? null,
      startDate:       req.body.startDate      ?? null,
      endDate:         req.body.endDate        ?? null,
      signingDate:     req.body.signingDate    ?? null,
      status:          req.body.status         ?? "draft",
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── POST /debt-recovery-files ─────────────────────────────────────────────
router.post("/debt-recovery-files", async (req, res) => {
  try {
    const { debtRecoveryFilesTable } = await import("@workspace/db");
    const [row] = await db.insert(debtRecoveryFilesTable).values({
      caseId:        req.body.caseId,
      debtorName:    req.body.debtorName,
      debtorTaxId:   req.body.debtorTaxId   ?? null,
      debtorPhone:   req.body.debtorPhone   ?? null,
      debtorAddress: req.body.debtorAddress ?? null,
      debtAmount:    req.body.debtAmount    ?? 0,
      debtReason:    req.body.debtReason    ?? null,
      dueDate:       req.body.dueDate       ?? null,
      currentStage:  req.body.currentStage  ?? "notice",
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── POST /company-files ───────────────────────────────────────────────────
router.post("/company-files", async (req, res) => {
  try {
    const { companyFilesTable } = await import("@workspace/db");
    const [row] = await db.insert(companyFilesTable).values({
      caseId:       req.body.caseId,
      companyType:  req.body.companyType  ?? "sarl",
      proposedName: req.body.proposedName ?? null,
      capital:      req.body.capital      ?? null,
      activity:     req.body.activity     ?? null,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── POST /company-files/:id/partners ─────────────────────────────────────
router.post("/company-files/:id/partners", async (req, res) => {
  try {
    const { companyPartnersTable } = await import("@workspace/db");
    const [row] = await db.insert(companyPartnersTable).values({
      companyFileId:    Number(req.params.id),
      partnerName:      req.body.partnerName,
      partnerTaxId:     req.body.partnerTaxId     ?? null,
      sharesPercentage: req.body.sharesPercentage ?? null,
      position:         req.body.position         ?? null,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── GET /cases/:id/contract ──────────────────────────────────────────────
router.get("/cases/:id/contract", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const [c] = await db.select({ id: casesTable.id }).from(casesTable)
    .where(and(eq(casesTable.id, caseId), eq(casesTable.orgId, actor?.orgId ?? 0)));
  if (!c) { res.status(404).json({ error: "Not found" }); return; }
  const { contractsTable, contractVersionsTable } = await import("@workspace/db");
  const [contract] = await db.select().from(contractsTable)
    .where(eq(contractsTable.caseId, caseId));
  if (!contract) { res.json(null); return; }
  const versions = await db.select().from(contractVersionsTable)
    .where(eq(contractVersionsTable.contractId, contract.id))
    .orderBy(contractVersionsTable.versionNumber);
  res.json({ ...contract, versions });
});

// ─── GET /cases/:id/debt-recovery ────────────────────────────────────────
router.get("/cases/:id/debt-recovery", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const [c] = await db.select({ id: casesTable.id }).from(casesTable)
    .where(and(eq(casesTable.id, caseId), eq(casesTable.orgId, actor?.orgId ?? 0)));
  if (!c) { res.status(404).json({ error: "Not found" }); return; }
  const { debtRecoveryFilesTable, debtRecoveryPaymentsTable } = await import("@workspace/db");
  const [debtFile] = await db.select().from(debtRecoveryFilesTable)
    .where(eq(debtRecoveryFilesTable.caseId, caseId));
  if (!debtFile) { res.json(null); return; }
  const payments = await db.select().from(debtRecoveryPaymentsTable)
    .where(eq(debtRecoveryPaymentsTable.debtRecoveryFileId, debtFile.id))
    .orderBy(debtRecoveryPaymentsTable.receivedAt);
  res.json({ ...debtFile, payments });
});

// ─── POST /cases/:id/debt-recovery/payments ──────────────────────────────
router.post("/cases/:id/debt-recovery/payments", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const actor = (req as typeof req & { user?: { id?: number } }).user;
  const { debtRecoveryFilesTable, debtRecoveryPaymentsTable } = await import("@workspace/db");
  const [debtFile] = await db.select().from(debtRecoveryFilesTable)
    .where(eq(debtRecoveryFilesTable.caseId, caseId));
  if (!debtFile) { res.status(404).json({ error: "Debt file not found" }); return; }
  const { amount, paymentMethod, reference, notes, receivedAt } = req.body as Record<string, string>;
  const [payment] = await db.insert(debtRecoveryPaymentsTable).values({
    debtRecoveryFileId: debtFile.id,
    amount,
    paymentMethod: paymentMethod || null,
    reference: reference || null,
    notes: notes || null,
    receivedAt: new Date(receivedAt || Date.now()),
    recordedBy: actor?.id ?? null,
  }).returning();
  await db.update(debtRecoveryFilesTable)
    .set({ recoveredAmount: sql`${debtRecoveryFilesTable.recoveredAmount} + ${amount}::numeric` })
    .where(eq(debtRecoveryFilesTable.id, debtFile.id));
  res.status(201).json(payment);
});

// ─── GET /cases/:id/company ───────────────────────────────────────────────
router.get("/cases/:id/company", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const [c] = await db.select({ id: casesTable.id }).from(casesTable)
    .where(and(eq(casesTable.id, caseId), eq(casesTable.orgId, actor?.orgId ?? 0)));
  if (!c) { res.status(404).json({ error: "Not found" }); return; }
  const { companyFilesTable, companyPartnersTable, companyCreationStepsTable } = await import("@workspace/db");
  const [companyFile] = await db.select().from(companyFilesTable)
    .where(eq(companyFilesTable.caseId, caseId));
  if (!companyFile) { res.json(null); return; }
  const [partners, steps] = await Promise.all([
    db.select().from(companyPartnersTable)
      .where(eq(companyPartnersTable.companyFileId, companyFile.id))
      .orderBy(companyPartnersTable.positionOrder),
    db.select().from(companyCreationStepsTable)
      .where(eq(companyCreationStepsTable.companyFileId, companyFile.id))
      .orderBy(companyCreationStepsTable.stepOrder),
  ]);
  res.json({ ...companyFile, partners, steps });
});

// ─── PATCH /company-creation-steps/:stepId/toggle ────────────────────────
router.patch("/company-creation-steps/:stepId/toggle", async (req, res): Promise<void> => {
  const stepId = Number(req.params.stepId);
  const { companyCreationStepsTable } = await import("@workspace/db");
  const [step] = await db.select().from(companyCreationStepsTable)
    .where(eq(companyCreationStepsTable.id, stepId));
  if (!step) { res.status(404).json({ error: "Step not found" }); return; }
  const newCompleted = step.isCompleted === 1 ? 0 : 1;
  const [updated] = await db.update(companyCreationStepsTable)
    .set({ isCompleted: newCompleted, completedAt: newCompleted === 1 ? new Date() : null })
    .where(eq(companyCreationStepsTable.id, stepId)).returning();
  res.json(updated);
});

export default router;
