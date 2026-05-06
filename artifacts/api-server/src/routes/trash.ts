import { Router } from "express";
import { db, casesTable, clientsTable, documentsTable, invoicesTable, eventsTable } from "@workspace/db";
import { isNotNull, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

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

router.delete("/trash/permanent/:entity/:id", requireAuth, async (req, res): Promise<void> => {
  const { entity, id } = req.params;
  const numId = Number(id);
  if (entity === "cases") {
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
