import { Router } from "express";
import { db, documentsTable, casesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateDocumentBody } from "@workspace/api-zod";
import { CaseEventLogger } from "../services/caseEventLogger.js";

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
  const [row] = await db.insert(documentsTable).values(parsed.data).returning();
  if (row.caseId) {
    void CaseEventLogger.log({
      caseId: row.caseId, eventType: "document_added",
      metadata: { document_name: row.name },
      relatedEntityType: "document", relatedEntityId: row.id,
    });
  }
  res.status(201).json({ ...row, caseName: null });
});

router.delete("/documents/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  await db.delete(documentsTable).where(eq(documentsTable.id, id));
  if (doc?.caseId) {
    void CaseEventLogger.log({
      caseId: doc.caseId, eventType: "document_removed",
      metadata: { document_name: doc.name },
    });
  }
  res.status(204).send();
});

export default router;
