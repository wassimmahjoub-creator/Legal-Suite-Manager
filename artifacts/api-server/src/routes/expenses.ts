import { Router } from "express";
import { db, casesTable } from "@workspace/db";
import { expensesTable } from "@workspace/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getActor } from "../middleware/auth.js";

const router = Router();

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

router.get("/expenses", async (req, res) => {
  const actor = getActor(req);
  const orgId = actor.orgId ?? 0;
  const caseId = req.query.caseId ? Number(req.query.caseId) : null;

  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));

  const rows = await db.select().from(expensesTable)
    .where(caseId
      ? and(eq(expensesTable.caseId, caseId), inArray(expensesTable.caseId, orgCases))
      : inArray(expensesTable.caseId, orgCases));
  res.json(rows.map(fmt));
});

router.post("/expenses", async (req, res): Promise<void> => {
  const actor = getActor(req);
  const orgId = actor.orgId ?? 0;
  const body = req.body as Record<string, unknown>;

  const [c] = await db.select({ id: casesTable.id }).from(casesTable)
    .where(and(eq(casesTable.id, Number(body.caseId)), eq(casesTable.orgId, orgId)));
  if (!c) { res.status(403).json({ error: "غير مصرح" }); return; }

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

router.put("/expenses/:id", async (req, res): Promise<void> => {
  const actor = getActor(req);
  const orgId = actor.orgId ?? 0;
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;

  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));
  const [own] = await db.select({ id: expensesTable.id }).from(expensesTable)
    .where(and(eq(expensesTable.id, id), inArray(expensesTable.caseId, orgCases)));
  if (!own) { res.status(404).json({ error: "غير موجود" }); return; }

  const [row] = await db.update(expensesTable).set({
    date: body.date as string,
    typeValue: body.typeValue as string,
    description: (body.description as string) ?? "",
    amount: String(body.amount),
    reimbursable: Boolean(body.reimbursable ?? true),
  }).where(eq(expensesTable.id, id)).returning();
  res.json(fmt(row!));
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const actor = getActor(req);
  const orgId = actor.orgId ?? 0;
  const id = Number(req.params.id);

  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));
  const [own] = await db.select({ id: expensesTable.id }).from(expensesTable)
    .where(and(eq(expensesTable.id, id), inArray(expensesTable.caseId, orgCases)));
  if (!own) { res.status(404).json({ error: "غير موجود" }); return; }

  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.json({ ok: true });
});

export default router;
