import { Router } from "express";
import { db, insuranceCompaniesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/insurance-companies", requireAuth, async (_req, res) => {
  res.json(await db.select().from(insuranceCompaniesTable).orderBy(insuranceCompaniesTable.name));
});

router.post("/insurance-companies", requireAuth, async (req, res): Promise<void> => {
  const { name, phone, email, address, contactPerson, notes } = req.body as Record<string, string>;
  if (!name) { res.status(400).json({ error: "الاسم مطلوب" }); return; }
  const [row] = await db.insert(insuranceCompaniesTable).values({ name, phone, email, address, contactPerson, notes }).returning();
  res.status(201).json(row);
});

router.put("/insurance-companies/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, phone, email, address, contactPerson, notes } = req.body as Record<string, string>;
  const [row] = await db.update(insuranceCompaniesTable).set({ name, phone, email, address, contactPerson, notes }).where(eq(insuranceCompaniesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json(row);
});

router.delete("/insurance-companies/:id", requireAuth, async (req, res) => {
  await db.delete(insuranceCompaniesTable).where(eq(insuranceCompaniesTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
