import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/expenses", async (req, res) => {
  const caseId = req.query.caseId ? Number(req.query.caseId) : null;
  const rows = caseId
    ? await db.select().from(expensesTable).where(eq(expensesTable.caseId, caseId))
    : await db.select().from(expensesTable);
  res.json(rows.map(fmt));
});

router.post("/expenses", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const [row] = await db.insert(expensesTable).values({
    caseId: Number(body.caseId),
    date: body.date as string,
    typeValue: body.typeValue as string,
    description: (body.description as string) ?? "",
    amount: String(body.amount),
    reimbursable: Boolean(body.reimbursable ?? true),
  }).returning();
  res.status(201).json(fmt(row));
});

router.put("/expenses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  const [row] = await db.update(expensesTable).set({
    date: body.date as string,
    typeValue: body.typeValue as string,
    description: (body.description as string) ?? "",
    amount: String(body.amount),
    reimbursable: Boolean(body.reimbursable ?? true),
  }).where(eq(expensesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(fmt(row));
});

router.delete("/expenses/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.json({ ok: true });
});

function fmt(row: typeof expensesTable.$inferSelect) {
  return {
    id: row.id,
    caseId: row.caseId,
    date: row.date,
    typeValue: row.typeValue,
    description: row.description,
    amount: Number(row.amount),
    reimbursable: row.reimbursable,
    createdAt: row.createdAt,
  };
}

export default router;
