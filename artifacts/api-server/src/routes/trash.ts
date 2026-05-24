import { Router } from "express";
import {
  db, casesTable, clientsTable, documentsTable, invoicesTable,
  tasksTable, proceduresTable, deadlinesTable, caseTeamsTable,
  caseRelationsTable, confidentialNotesTable, expensesTable,
  opponentsTable, eventsTable, communicationsTable, correspondancesTable,
  conflictChecksTable,
} from "@workspace/db";
import { isNotNull, eq, or } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/trash", requireAuth, async (_req, res) => {
  const [cases, clients, documents, invoices] = await Promise.all([
    db.select().from(casesTable).where(isNotNull(casesTable.deletedAt)),
    db.select().from(clientsTable).where(isNotNull(clientsTable.deletedAt)),
    db.select().from(documentsTable).where(isNotNull(documentsTable.deletedAt)),
    db.select().from(invoicesTable).where(isNotNull(invoicesTable.deletedAt)),
  ]);
  res.json({ cases, clients, documents, invoices });
});

router.patch("/trash/restore/:entity/:id", requireAuth, async (req, res): Promise<void> => {
  const { entity, id } = req.params;
  const numId = Number(id);
  if (entity === "cases") {
    await db.update(casesTable).set({ deletedAt: null }).where(eq(casesTable.id, numId));
  } else if (entity === "clients") {
    await db.update(clientsTable).set({ deletedAt: null }).where(eq(clientsTable.id, numId));
  } else if (entity === "documents") {
    await db.update(documentsTable).set({ deletedAt: null }).where(eq(documentsTable.id, numId));
  } else if (entity === "invoices") {
    await db.update(invoicesTable).set({ deletedAt: null }).where(eq(invoicesTable.id, numId));
  } else {
    res.status(400).json({ error: "نوع غير معروف" });
    return;
  }
  res.json({ ok: true });
});

router.delete("/trash/permanent/:entity/:id", requireAdmin, async (req, res): Promise<void> => {
  const { entity, id } = req.params;
  const numId = Number(id);
  if (entity === "cases") {
    // Nullify nullable FK references first
    await Promise.all([
      db.update(opponentsTable).set({ caseId: null }).where(eq(opponentsTable.caseId, numId)),
      db.update(eventsTable).set({ caseId: null }).where(eq(eventsTable.caseId, numId)),
      db.update(invoicesTable).set({ caseId: null }).where(eq(invoicesTable.caseId, numId)),
      db.update(communicationsTable).set({ caseId: null }).where(eq(communicationsTable.caseId, numId)),
      db.update(correspondancesTable).set({ caseId: null }).where(eq(correspondancesTable.caseId, numId)),
      db.update(conflictChecksTable).set({ otherCaseId: null }).where(eq(conflictChecksTable.otherCaseId, numId)),
    ]);
    // Delete non-nullable child rows
    await Promise.all([
      db.delete(tasksTable).where(eq(tasksTable.caseId, numId)),
      db.delete(proceduresTable).where(eq(proceduresTable.caseId, numId)),
      db.delete(deadlinesTable).where(eq(deadlinesTable.caseId, numId)),
      db.delete(caseTeamsTable).where(eq(caseTeamsTable.caseId, numId)),
      db.delete(confidentialNotesTable).where(eq(confidentialNotesTable.caseId, numId)),
      db.delete(expensesTable).where(eq(expensesTable.caseId, numId)),
      db.delete(documentsTable).where(eq(documentsTable.caseId, numId)),
      db.delete(caseRelationsTable).where(
        or(eq(caseRelationsTable.caseId, numId), eq(caseRelationsTable.relatedCaseId, numId))
      ),
    ]);
    // Now safe to delete the case (CASCADE handles: case_stages, legal_deadlines,
    // case_events, conflict_checks, company_files, contracts, debt_recovery_files)
    await db.delete(casesTable).where(eq(casesTable.id, numId));
  } else if (entity === "clients") {
    await db.delete(clientsTable).where(eq(clientsTable.id, numId));
  } else if (entity === "documents") {
    await db.delete(documentsTable).where(eq(documentsTable.id, numId));
  } else if (entity === "invoices") {
    await db.delete(invoicesTable).where(eq(invoicesTable.id, numId));
  } else {
    res.status(400).json({ error: "نوع غير معروف" });
    return;
  }
  res.status(204).send();
});

export default router;
