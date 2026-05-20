import { Router } from "express";
import { db, casesTable } from "@workspace/db";
import { expensesTable } from "@workspace/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getActor } from "../middleware/auth.js";
import { z } from "zod";

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

const CreateExpenseBody = z.object({
  caseId:      z.number({ invalid_type_error: "معرّف القضية مطلوب" }).int().positive(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة التاريخ غير صحيحة (YYYY-MM-DD)"),
  typeValue:   z.string().min(1, "نوع المصروف مطلوب"),
  description: z.string().min(1, "الوصف مطلوب"),
  amount:      z.number({ invalid_type_error: "المبلغ يجب أن يكون رقماً" }).positive("المبلغ يجب أن يكون موجباً"),
  reimbursable: z.boolean().optional().default(true),
});

router.post("/expenses", async (req, res): Promise<void> => {
  const actor = getActor(req);
  const orgId = actor.orgId ?? 0;
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" });
    return;
  }
  const body = parsed.data;

  const [c] = await db.select({ id: casesTable.id }).from(casesTable)
    .where(and(eq(casesTable.id, body.caseId), eq(casesTable.orgId, orgId)));
  if (!c) { res.status(403).json({ error: "غير مصرح" }); return; }

  const [row] = await db.insert(expensesTable).values({
    caseId:      body.caseId,
    date:        body.date,
    typeValue:   body.typeValue,
    description: body.description,
    amount:      String(body.amount),
    reimbursable: body.reimbursable,
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
