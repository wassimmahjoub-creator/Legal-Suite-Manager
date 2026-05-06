import { Router } from "express";
import { db, templatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/templates", requireAuth, async (_req, res) => {
  const rows = await db.select().from(templatesTable).orderBy(templatesTable.createdAt);
  res.json(rows);
});

router.post("/templates", requireAuth, async (req, res): Promise<void> => {
  const { name, type, content } = req.body as Record<string, string>;
  if (!name) {
    res.status(400).json({ error: "الاسم مطلوب" });
    return;
  }
  const [row] = await db.insert(templatesTable).values({
    name, type: type ?? "أخرى", content: content ?? "",
  }).returning();
  res.status(201).json(row);
});

router.put("/templates/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, type, content } = req.body as Record<string, string>;
  const [row] = await db.update(templatesTable).set({ name, type, content })
    .where(eq(templatesTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "غير موجود" });
    return;
  }
  res.json(row);
});

router.delete("/templates/:id", requireAuth, async (req, res) => {
  await db.delete(templatesTable).where(eq(templatesTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
