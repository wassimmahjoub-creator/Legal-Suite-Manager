import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, invitationsTable, usersTable, organizationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { signToken } from "../middleware/auth.js";
import type { AuthPayload } from "../middleware/auth.js";

const PLAN_LIMITS: Record<string, number> = { solo: 1, cabinet: 5, premium: -1 };

const router = Router();

const ROLES: Record<string, string> = {
  admin: "مدير",
  partner: "شريك",
  lawyer: "محامي",
  secretary: "سكرتيرة",
  trainee: "متربص",
  accountant: "محاسب",
};

function getUser(req: Express.Request) {
  return (req as typeof req & { user: AuthPayload }).user;
}

router.get("/invitations", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);
  if (!u.orgId) { res.json([]); return; }
  const rows = await db.select().from(invitationsTable)
    .where(and(eq(invitationsTable.orgId, u.orgId), eq(invitationsTable.status, "pending")));
  res.json(rows.map(r => ({ ...r, roleLabel: ROLES[r.role] ?? r.role })));
});

router.post("/invitations", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);
  if (u.role !== "admin") { res.status(403).json({ error: "غير مصرح لك" }); return; }
  if (!u.orgId) { res.status(400).json({ error: "لا يوجد مكتب" }); return; }
  const { email, role } = req.body as { email: string; role: string };
  if (!email) { res.status(400).json({ error: "البريد الإلكتروني مطلوب" }); return; }

  // Collaborator limit check
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, u.orgId));
  if (org) {
    const limit = PLAN_LIMITS[org.subscriptionPlan] ?? 1;
    if (limit !== -1) {
      const members = await db.select({ id: usersTable.id }).from(usersTable)
        .where(and(eq(usersTable.orgId, u.orgId), eq(usersTable.status, "active")));
      const collaboratorsUsed = Math.max(0, members.length - 1);
      if (collaboratorsUsed >= limit) {
        res.status(400).json({
          error: "لقد بلغتَ الحدَّ المتاح في خطتك. يمكنك إضافة مستخدم إضافي بـ 12 د.ت في الشهر.",
          limitReached: true,
          currentCount: collaboratorsUsed,
          limit,
        });
        return;
      }
    }
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) { res.status(400).json({ error: "هذا البريد الإلكتروني مسجّل بالفعل" }); return; }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.update(invitationsTable)
    .set({ status: "expired" })
    .where(and(eq(invitationsTable.orgId, u.orgId), eq(invitationsTable.email, email), eq(invitationsTable.status, "pending")));

  const [inv] = await db.insert(invitationsTable).values({
    orgId: u.orgId, email, role: role ?? "lawyer", token, invitedBy: u.id, expiresAt,
  }).returning();

  res.status(201).json({ ...inv, roleLabel: ROLES[inv.role] ?? inv.role, token });
});

router.delete("/invitations/:id", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);
  if (u.role !== "admin") { res.status(403).json({ error: "غير مصرح لك" }); return; }
  const id = parseInt(String(req.params["id"] ?? "0"));
  await db.update(invitationsTable).set({ status: "expired" })
    .where(and(eq(invitationsTable.id, id), eq(invitationsTable.orgId, u.orgId!)));
  res.json({ success: true });
});

router.get("/invitations/accept/:token", async (req, res): Promise<void> => {
  const { token } = req.params as { token: string };
  const [inv] = await db.select().from(invitationsTable).where(eq(invitationsTable.token, token));
  if (!inv) { res.status(404).json({ error: "الدعوة غير موجودة" }); return; }
  if (inv.status !== "pending") { res.status(400).json({ error: "هذه الدعوة منتهية أو مستخدمة" }); return; }
  if (new Date() > inv.expiresAt) {
    await db.update(invitationsTable).set({ status: "expired" }).where(eq(invitationsTable.id, inv.id));
    res.status(400).json({ error: "انتهت صلاحية الدعوة" }); return;
  }
  res.json({ email: inv.email, role: inv.role, roleLabel: ROLES[inv.role] ?? inv.role });
});

router.post("/invitations/accept/:token", async (req, res): Promise<void> => {
  const { token } = req.params as { token: string };
  const [inv] = await db.select().from(invitationsTable).where(eq(invitationsTable.token, token));
  if (!inv) { res.status(404).json({ error: "الدعوة غير موجودة" }); return; }
  if (inv.status !== "pending") { res.status(400).json({ error: "هذه الدعوة منتهية أو مستخدمة" }); return; }
  if (new Date() > inv.expiresAt) {
    await db.update(invitationsTable).set({ status: "expired" }).where(eq(invitationsTable.id, inv.id));
    res.status(400).json({ error: "انتهت صلاحية الدعوة" }); return;
  }

  const { name, password } = req.body as { name: string; password: string };
  if (!name || !password || password.length < 6) {
    res.status(400).json({ error: "الاسم وكلمة المرور (6 أحرف على الأقل) مطلوبان" }); return;
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, inv.email));
  if (existing.length > 0) { res.status(400).json({ error: "هذا البريد الإلكتروني مسجّل بالفعل" }); return; }

  const passwordHash = await bcrypt.hash(password, 10);
  const [newUser] = await db.insert(usersTable).values({
    name, email: inv.email, passwordHash, role: inv.role, orgId: inv.orgId, status: "active",
  }).returning();

  await db.update(invitationsTable).set({ status: "accepted" }).where(eq(invitationsTable.id, inv.id));

  const jwtToken = signToken({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, orgId: inv.orgId });
  res.json({
    token: jwtToken,
    user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, roleLabel: ROLES[newUser.role] ?? newUser.role, orgId: inv.orgId },
  });
});

export default router;
