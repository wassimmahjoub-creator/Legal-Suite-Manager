import { Router } from "express";
import {
  db,
  casesTable,
  clientsTable,
  proceduresTable,
  deadlinesTable,
  eventsTable,
  invoicesTable,
  documentsTable,
  cabinetSettingsTable,
} from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";

const router = Router();

router.get("/cases/:id/pdf-data", async (req, res) => {
  const caseId = Number(req.params.id);
  if (!caseId || isNaN(caseId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [caseRow] = await db
    .select({
      id: casesTable.id,
      caseNumber: casesTable.caseNumber,
      courtCaseNumber: casesTable.courtCaseNumber,
      clientFileRef: casesTable.clientFileRef,
      title: casesTable.title,
      status: casesTable.status,
      court: casesTable.court,
      division: casesTable.division,
      lawyer: casesTable.lawyer,
      nextHearing: casesTable.nextHearing,
      opponentName: casesTable.opponentName,
      opponentLawyer: casesTable.opponentLawyer,
      judgmentText: casesTable.judgmentText,
      description: casesTable.description,
      procedureStage: casesTable.procedureStage,
      createdAt: casesTable.createdAt,
      clientId: casesTable.clientId,
      clientName: clientsTable.name,
      clientType: clientsTable.clientType,
      clientTaxId: clientsTable.taxId,
      clientPhone: clientsTable.phone,
      clientAddress: clientsTable.address,
    })
    .from(casesTable)
    .leftJoin(clientsTable, eq(casesTable.clientId, clientsTable.id))
    .where(eq(casesTable.id, caseId))
    .limit(1);

  if (!caseRow) return res.status(404).json({ error: "Case not found" });

  const [procedures, deadlines, events, invoices, documents, cabinetArr] = await Promise.all([
    db.select().from(proceduresTable).where(eq(proceduresTable.caseId, caseId)).orderBy(proceduresTable.createdAt),
    db.select().from(deadlinesTable).where(eq(deadlinesTable.caseId, caseId)).orderBy(deadlinesTable.dueDate),
    db.select().from(eventsTable).where(eq(eventsTable.caseId, caseId)).orderBy(eventsTable.date),
    db.select().from(invoicesTable).where(and(eq(invoicesTable.caseId, caseId), isNull(invoicesTable.deletedAt))).orderBy(invoicesTable.issueDate),
    db.select().from(documentsTable).where(and(eq(documentsTable.caseId, caseId), isNull(documentsTable.deletedAt))).orderBy(documentsTable.createdAt),
    db.select().from(cabinetSettingsTable).limit(1),
  ]);

  return res.json({
    case: caseRow,
    procedures,
    deadlines,
    events,
    invoices,
    documents,
    cabinet: cabinetArr[0] ?? null,
  });
});

export default router;
