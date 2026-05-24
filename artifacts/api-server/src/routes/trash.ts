import { Router } from "express";
import { db, casesTable, clientsTable, documentsTable, invoicesTable, eventsTable } from "@workspace/db";
import { isNotNull, eq } from "drizzle-orm";
import { requireAuth, requireAdmin, getActor } from "../middleware/auth.js";
import { logAudit } from "./audit-logs.js";

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
  const actor = getActor(req);

  let label: string | undefined;
  if (entity === "cases") {
    const [row] = await db.select({ title: casesTable.title, caseNumber: casesTable.caseNumber }).from(casesTable).where(eq(casesTable.id, numId));
    label = row ? `${row.caseNumber} — ${row.title}` : String(numId);
    await db.update(casesTable).set({ deletedAt: null }).where(eq(casesTable.id, numId));
  } else if (entity === "clients") {
    const [row] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, numId));
    label = row?.name ?? String(numId);
    await db.update(clientsTable).set({ deletedAt: null }).where(eq(clientsTable.id, numId));
  } else if (entity === "documents") {
    await db.update(documentsTable).set({ deletedAt: null }).where(eq(documentsTable.id, numId));
    label = String(numId);
  } else if (entity === "invoices") {
    await db.update(invoicesTable).set({ deletedAt: null }).where(eq(invoicesTable.id, numId));
    label = String(numId);
  } else {
    res.status(400).json({ error: "نوع غير معروف" });
    return;
  }
  void logAudit({
    entityType: entity, entityId: numId, action: "restore",
    newValue: label,
    userId: actor?.id, userName: actor?.name,
  });
  res.json({ ok: true });
});

router.delete("/trash/permanent/:entity/:id", requireAdmin, async (req, res): Promise<void> => {
  const { entity, id } = req.params;
  const numId = Number(id);
  const actor = getActor(req);

  let label: string | undefined;
  if (entity === "cases") {
    const [row] = await db.select({ title: casesTable.title, caseNumber: casesTable.caseNumber }).from(casesTable).where(eq(casesTable.id, numId));
    label = row ? `${row.caseNumber} — ${row.title}` : String(numId);
    await db.delete(casesTable).where(eq(casesTable.id, numId));
  } else if (entity === "clients") {
    const [row] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, numId));
    label = row?.name ?? String(numId);
    await db.delete(clientsTable).where(eq(clientsTable.id, numId));
  } else if (entity === "documents") {
    await db.delete(documentsTable).where(eq(documentsTable.id, numId));
    label = String(numId);
  } else if (entity === "invoices") {
    await db.delete(invoicesTable).where(eq(invoicesTable.id, numId));
    label = String(numId);
  } else {
    res.status(400).json({ error: "نوع غير معروف" });
    return;
  }
  void logAudit({
    entityType: entity, entityId: numId, action: "delete_permanent",
    oldValue: label,
    userId: actor?.id, userName: actor?.name,
  });
  res.status(204).send();
});

export default router;
