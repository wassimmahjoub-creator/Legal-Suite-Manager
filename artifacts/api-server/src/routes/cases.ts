import { Router } from "express";
import { db, casesTable, clientsTable } from "@workspace/db";
import { eq, isNull, isNotNull, like, sql, inArray, and, or } from "drizzle-orm";
import { CreateCaseBody, UpdateCaseBody } from "@workspace/api-zod";
import { CaseEventLogger } from "../services/caseEventLogger.js";

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

router.post("/cases", async (req, res) => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const actor = (req as typeof req & { user?: { id: number; orgId?: number } }).user;
  const orgId = actor?.orgId ?? 0;

  const year = new Date().getFullYear();
  const yearPrefix = `${year}-`;
  const [count] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(casesTable)
    .where(and(eq(casesTable.orgId, orgId), like(casesTable.caseNumber, `${yearPrefix}%`)));
  const next = (count?.cnt ?? 0) + 1;
  const caseNumber = `${year}-${String(next).padStart(4, "0")}`;

  const extras = extractExtras(req.body as Record<string, unknown>);
  const [row] = await db.insert(casesTable).values({ ...parsed.data, caseNumber, orgId, ...extras }).returning();
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));

  // Auto-create initial stage
  try {
    const { caseStagesTable } = await import("@workspace/db");
    const initialStage = (extras.litigationDegree as string) || "first_instance";
    await db.insert(caseStagesTable).values({
      caseId: row.id,
      stage: initialStage,
      enteredAt: row.openedAt ? new Date(row.openedAt) : row.createdAt,
      createdBy: actor?.id ?? null,
    });
  } catch { /* non-blocking */ }

  void CaseEventLogger.log({
    caseId: row.id,
    eventType: "case_filed",
    occurredAt: row.openedAt ? new Date(row.openedAt) : row.createdAt,
    actorUserId: actor?.id ?? null,
  });
  res.status(201).json({ ...row, clientName: client?.name ?? "" });
});

router.get("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .select(caseFields)
    .from(casesTable)
    .leftJoin(clientsTable, eq(casesTable.clientId, clientsTable.id))
    .where(eq(casesTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.put("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const extras = extractExtras(req.body as Record<string, unknown>);
  const [row] = await db.update(casesTable).set({ ...parsed.data, ...extras }).where(eq(casesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));
  res.json({ ...row, clientName: client?.name ?? "" });
});

// Partial update — used by wizard, CaseDetail tabs, draft saves
router.patch("/cases/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
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
  const [before] = await db.select().from(casesTable).where(eq(casesTable.id, id));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [row] = await db.update(casesTable).set(set as any).where(eq(casesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  if (before) {
    const watchedFields = ["title", "caseType", "litigationDegree", "procedureType", "feeMethod", "disputeValue", "agreedFees", "confidentialityLevel"] as const;
    const changed = watchedFields.filter(f => f in set && String((before as Record<string, unknown>)[f] ?? "") !== String(set[f] ?? ""));
    if (changed.length > 0) {
      const actor = (req as typeof req & { user?: { id: number } }).user;
      void CaseEventLogger.log({ caseId: id, eventType: "case_updated", actorUserId: actor?.id ?? null, metadata: { changed_fields: changed } });
    }
  }

  res.json(row);
});

router.patch("/cases/:id/archive", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const archivedAt = row.archivedAt ? null : new Date();
  await db.update(casesTable).set({ archivedAt, status: archivedAt ? "archived" : "active" }).where(eq(casesTable.id, id));
  const actor = (req as typeof req & { user?: { id: number } }).user;
  void CaseEventLogger.log({ caseId: id, eventType: archivedAt ? "case_archived" : "case_reopened", actorUserId: actor?.id ?? null });
  res.json({ archived: !!archivedAt });
});

router.patch("/cases/:id/soft-delete", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.update(casesTable).set({ deletedAt: new Date() }).where(eq(casesTable.id, id));
  res.json({ deleted: true });
});

router.delete("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(casesTable).where(eq(casesTable.id, id));
  res.status(204).send();
});

export default router;
