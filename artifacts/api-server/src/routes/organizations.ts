import { Router } from "express";
import { db, organizationsTable, usersTable, billingHistoryTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import type { AuthPayload } from "../middleware/auth.js";
import { PLANS_MAP } from "@workspace/plans";

const router = Router();

function getUser(req: Express.Request) {
  return (req as typeof req & { user: AuthPayload }).user;
}

router.get("/organization", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);

  /* Token may be old (orgId missing). Always resolve from DB. */
  let orgId: number | undefined = u.orgId;
  if (!orgId) {
    const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, u.id));
    orgId = dbUser?.orgId ?? undefined;

    /* Still no org — auto-provision one (same logic as login route) */
    if (!orgId) {
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 90);
      const [newOrg] = await db.insert(organizationsTable).values({
        name: u.email,
        ownerId: u.id,
        subscriptionPlan: "solo",
        subscriptionStatus: "trial",
        billingCycle: "monthly",
        trialStartDate: now,
        trialEndDate: trialEnd,
      }).returning();
      await db.update(usersTable).set({ orgId: newOrg.id }).where(eq(usersTable.id, u.id));
      orgId = newOrg.id;
    }
  }

  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
  if (!org) { res.status(404).json({ error: "المكتب غير موجود" }); return; }

  const now = new Date();
  const trialEnd = new Date(org.trialEndDate);
  const daysRemaining = org.subscriptionStatus === "trial"
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const isTrialExpired = org.subscriptionStatus === "trial" && now > trialEnd;
  const plan = PLANS_MAP[org.subscriptionPlan] ?? PLANS_MAP["solo"]!;

  const members = await db.select({ id: usersTable.id }).from(usersTable)
    .where(and(eq(usersTable.orgId, u.orgId), eq(usersTable.status, "active")));

  const memberCount = members.length;
  const collaboratorsUsed = Math.max(0, memberCount - 1);
  const includedCollaborators = plan.includedCollaborators;
  const extraCollaborators = includedCollaborators === -1
    ? 0
    : Math.max(0, collaboratorsUsed - includedCollaborators);
  const allowedTotal = includedCollaborators === -1 ? null : includedCollaborators + 1;
  const remaining = includedCollaborators === -1 ? null : Math.max(0, includedCollaborators - collaboratorsUsed);

  const basePriceMonthly = plan.priceMonthly;
  const extraCost = extraCollaborators * plan.extraCollaboratorPrice;
  const estimatedMonthlyTotal = basePriceMonthly + extraCost;

  res.json({
    ...org,
    daysRemaining,
    isTrialExpired,
    plan,
    memberCount,
    collaboratorsUsed,
    includedCollaborators,
    extraCollaborators,
    allowedTotal,
    remaining,
    estimatedMonthlyTotal,
    extraCost,
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
  res.json(Object.values(PLANS_MAP));
});

router.put("/organization/upgrade", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);
  if (!u.orgId) { res.status(400).json({ error: "لا يوجد مكتب" }); return; }
  if (u.role !== "admin") { res.status(403).json({ error: "غير مصرح لك" }); return; }
  const { plan, billingCycle } = req.body as { plan: string; billingCycle: string };
  if (!PLANS_MAP[plan]) { res.status(400).json({ error: "خطة غير صالحة" }); return; }
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
