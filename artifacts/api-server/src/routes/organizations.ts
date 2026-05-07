import { Router } from "express";
import { db, organizationsTable, usersTable, billingHistoryTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import type { AuthPayload } from "../middleware/auth.js";

const router = Router();

const PLANS = {
  solo: {
    id: "solo",
    name: "محامي فردي",
    priceMonthly: 39,
    priceYearly: 390,
    collaborators: 0,
    extraCollaboratorPrice: 15,
    features: ["قضايا غير محدودة", "حرفاء غير محدودون", "الفوترة", "الوثائق", "الرزنامة", "التقارير الأساسية"],
  },
  cabinet: {
    id: "cabinet",
    name: "مكتب محاماة",
    priceMonthly: 99,
    priceYearly: 990,
    collaborators: 5,
    extraCollaboratorPrice: 15,
    features: ["حتى 5 مستخدمين", "صلاحيات متقدمة", "تقارير متقدمة", "محاسبة", "سير العمل القانوني", "بوابة الحرفاء"],
  },
  premium: {
    id: "premium",
    name: "مؤسسة قانونية",
    priceMonthly: 249,
    priceYearly: 2490,
    collaborators: -1,
    extraCollaboratorPrice: 0,
    features: ["مستخدمون غير محدودون", "دعم متعدد الفروع", "تحليلات متقدمة", "سجل التعديلات", "ميزات الذكاء الاصطناعي", "دعم مميز"],
  },
};

function getUser(req: Express.Request) {
  return (req as typeof req & { user: AuthPayload }).user;
}

router.get("/organization", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);
  if (!u.orgId) { res.json(null); return; }
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, u.orgId));
  if (!org) { res.status(404).json({ error: "المكتب غير موجود" }); return; }

  const now = new Date();
  const trialEnd = new Date(org.trialEndDate);
  const daysRemaining = org.subscriptionStatus === "trial"
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const isTrialExpired = org.subscriptionStatus === "trial" && now > trialEnd;
  const plan = PLANS[org.subscriptionPlan as keyof typeof PLANS] ?? PLANS.solo;

  const members = await db.select({ id: usersTable.id }).from(usersTable)
    .where(and(eq(usersTable.orgId, u.orgId), eq(usersTable.status, "active")));

  res.json({
    ...org,
    daysRemaining,
    isTrialExpired,
    plan,
    memberCount: members.length,
  });
});

router.put("/organization", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);
  if (!u.orgId) { res.status(400).json({ error: "لا يوجد مكتب" }); return; }
  if (u.role !== "admin") { res.status(403).json({ error: "غير مصرح لك" }); return; }
  const { name } = req.body as { name: string };
  if (!name?.trim()) { res.status(400).json({ error: "اسم المكتب مطلوب" }); return; }
  const [org] = await db.update(organizationsTable)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(organizationsTable.id, u.orgId))
    .returning();
  res.json(org);
});

router.get("/organization/plans", async (_req, res) => {
  res.json(Object.values(PLANS));
});

router.put("/organization/upgrade", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);
  if (!u.orgId) { res.status(400).json({ error: "لا يوجد مكتب" }); return; }
  if (u.role !== "admin") { res.status(403).json({ error: "غير مصرح لك" }); return; }
  const { plan, billingCycle } = req.body as { plan: string; billingCycle: string };
  if (!PLANS[plan as keyof typeof PLANS]) { res.status(400).json({ error: "خطة غير صالحة" }); return; }
  const [org] = await db.update(organizationsTable)
    .set({ subscriptionPlan: plan, billingCycle: billingCycle ?? "monthly", subscriptionStatus: "active", updatedAt: new Date() })
    .where(eq(organizationsTable.id, u.orgId))
    .returning();
  res.json(org);
});

router.get("/organization/billing-history", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);
  if (!u.orgId) { res.json([]); return; }
  const rows = await db.select().from(billingHistoryTable)
    .where(eq(billingHistoryTable.orgId, u.orgId));
  res.json(rows);
});

export default router;
