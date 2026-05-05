import { Router } from "express";
import { db, documentsTable, casesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateDocumentBody } from "@workspace/api-zod";

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
  res.status(201).json({ ...row, caseName: null });
});

router.delete("/documents/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(documentsTable).where(eq(documentsTable.id, id));
  res.status(204).send();
});

export default router;
