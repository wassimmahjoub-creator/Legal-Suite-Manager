import { Router } from "express";
import { db, bankAccountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/bank-accounts", requireAuth, async (_req, res) => {
  res.json(await db.select().from(bankAccountsTable).orderBy(bankAccountsTable.name));
});

router.post("/bank-accounts", requireAuth, async (req, res): Promise<void> => {
  const { name, accountNumber, bankName, balance, currency, notes } = req.body as Record<string, string>;
  if (!name) { res.status(400).json({ error: "الاسم مطلوب" }); return; }
  const [row] = await db.insert(bankAccountsTable).values({ name, accountNumber, bankName, balance: balance ?? "0", currency: currency ?? "TND", notes }).returning();
  res.status(201).json(row);
});

router.put("/bank-accounts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, accountNumber, bankName, balance, currency, notes } = req.body as Record<string, string>;
  const [row] = await db.update(bankAccountsTable).set({ name, accountNumber, bankName, balance, currency, notes }).where(eq(bankAccountsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json(row);
});

router.delete("/bank-accounts/:id", requireAuth, async (req, res) => {
  await db.delete(bankAccountsTable).where(eq(bankAccountsTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
