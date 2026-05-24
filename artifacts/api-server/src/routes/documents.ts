import { Router } from "express";
import { db, documentsTable, casesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateDocumentBody } from "@workspace/api-zod";
import { CaseEventLogger } from "../services/caseEventLogger.js";
import { getActor } from "../middleware/auth.js";
import { logAudit } from "./audit-logs.js";

const router = Router();

router.get("/documents", async (req, res) => {
  const { caseId } = req.query as Record<string, string>;
  let rows = await db
    .select({
      id: documentsTable.id,
      name: documentsTable.name,
      caseId: documentsTable.caseId,
      caseName: casesTable.title,
      fileType: documentsTable.fileType,
      url: documentsTable.url,
      createdAt: documentsTable.createdAt,
    })
    .from(documentsTable)
    .leftJoin(casesTable, eq(documentsTable.caseId, casesTable.id))
    .orderBy(documentsTable.createdAt);
  if (caseId) rows = rows.filter((r) => r.caseId === Number(caseId));
  res.json(rows);
});

router.post("/documents", async (req, res) => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const actor = getActor(req);
  const [row] = await db.insert(documentsTable).values(parsed.data).returning();
  if (row.caseId) {
    void CaseEventLogger.log({
      caseId: row.caseId, eventType: "document_added",
      metadata: { document_name: row.name },
      relatedEntityType: "document", relatedEntityId: row.id,
    });
  }
  void logAudit({
    entityType: "document", entityId: row.id, action: "create",
    newValue: row.name,
    userId: actor?.id, userName: actor?.name,
  });
  res.status(201).json({ ...row, caseName: null });
});

router.put("/documents/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, fileType, url } = req.body;
  const [row] = await db.update(documentsTable).set({
    ...(name     !== undefined && { name }),
    ...(fileType !== undefined && { fileType: fileType || null }),
    ...(url      !== undefined && { url: url || null }),
  }).where(eq(documentsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json(row);
});

router.delete("/documents/:id", async (req, res) => {
  const id = Number(req.params.id);
  const actor = getActor(req);
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  await db.delete(documentsTable).where(eq(documentsTable.id, id));
  if (doc?.caseId) {
    void CaseEventLogger.log({
      caseId: doc.caseId, eventType: "document_removed",
      metadata: { document_name: doc.name },
    });
  }
  void logAudit({
    entityType: "document", entityId: id, action: "delete",
    oldValue: doc?.name ?? String(id),
    userId: actor?.id, userName: actor?.name,
  });
  res.status(204).send();
});

export default router;
