import { Router } from "express";
import { db, courtsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/courts", requireAuth, async (_req, res) => {
  const rows = await db.select().from(courtsTable).orderBy(courtsTable.name);
  res.json(rows);
});

router.post("/courts", requireAuth, async (req, res): Promise<void> => {
  const { name, division, city, address, notes } = req.body as Record<string, string>;
  if (!name) { res.status(400).json({ error: "الاسم مطلوب" }); return; }
  const [row] = await db.insert(courtsTable).values({ name, division, city, address, notes }).returning();
  res.status(201).json(row);
});

router.put("/courts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, division, city, address, notes } = req.body as Record<string, string>;
  const [row] = await db.update(courtsTable).set({ name, division, city, address, notes }).where(eq(courtsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json(row);
});

router.delete("/courts/:id", requireAuth, async (req, res) => {
  await db.delete(courtsTable).where(eq(courtsTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
