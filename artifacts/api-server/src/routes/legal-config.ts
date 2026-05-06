import { Router } from "express";
import { db, legalConfigItemsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const DEFAULTS: Array<{ category: string; value: string; label: string }> = [
  { category: "case_types", value: "civil", label: "مدني" },
  { category: "case_types", value: "criminal", label: "جزائي" },
  { category: "case_types", value: "administrative", label: "إداري" },
  { category: "case_types", value: "commercial", label: "تجاري" },
  { category: "case_types", value: "family", label: "أحوال شخصية" },
  { category: "case_types", value: "labor", label: "اجتماعي" },
  { category: "case_types", value: "real_estate", label: "عقاري" },
  { category: "judgment_types", value: "first_degree", label: "ابتدائي" },
  { category: "judgment_types", value: "appeal", label: "استئناف" },
  { category: "judgment_types", value: "cassation", label: "تعقيب" },
  { category: "session_types", value: "hearing", label: "جلسة" },
  { category: "session_types", value: "meeting", label: "اجتماع" },
  { category: "session_types", value: "mediation", label: "وساطة" },
  { category: "fee_types", value: "consultation", label: "أتعاب استشارة" },
  { category: "fee_types", value: "representation", label: "أتعاب تمثيل" },
  { category: "fee_types", value: "success", label: "أتعاب نجاح" },
  { category: "expense_types", value: "court_fees", label: "رسوم قضائية" },
  { category: "expense_types", value: "transport", label: "تنقل" },
  { category: "expense_types", value: "postage", label: "بريد" },
  { category: "procedure_types", value: "filing", label: "إيداع مطلب" },
  { category: "procedure_types", value: "notification", label: "تبليغ" },
  { category: "procedure_types", value: "expertise", label: "خبرة" },
];

router.get("/legal-config", requireAuth, async (_req, res) => {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(legalConfigItemsTable);
  if (count === 0) {
    await db.insert(legalConfigItemsTable).values(DEFAULTS.map((d, i) => ({ ...d, sortOrder: i })));
  }
  const rows = await db.select().from(legalConfigItemsTable).orderBy(legalConfigItemsTable.category, legalConfigItemsTable.sortOrder);
  res.json(rows);
});

router.post("/legal-config", requireAuth, async (req, res): Promise<void> => {
  const { category, value, label } = req.body as Record<string, string>;
  if (!category || !value || !label) { res.status(400).json({ error: "جميع الحقول مطلوبة" }); return; }
  const [row] = await db.insert(legalConfigItemsTable).values({ category, value, label }).returning();
  res.status(201).json(row);
});

router.put("/legal-config/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { label, sortOrder } = req.body as Record<string, string>;
  const [row] = await db.update(legalConfigItemsTable).set({ label, sortOrder: sortOrder ? Number(sortOrder) : undefined }).where(eq(legalConfigItemsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json(row);
});

router.delete("/legal-config/:id", requireAuth, async (req, res) => {
  await db.delete(legalConfigItemsTable).where(eq(legalConfigItemsTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
