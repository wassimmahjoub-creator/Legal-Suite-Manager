import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, organizationsTable, passwordResetsTable } from "@workspace/db";
import { eq, sql, and, isNull } from "drizzle-orm";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

const ROLES: Record<string, string> = {
  admin: "مدير",
  partner: "شريك",
  lawyer: "محامي",
  secretary: "سكرتيرة",
  trainee: "متربص",
  accountant: "محاسب",
};

function fmtUser(u: typeof usersTable.$inferSelect) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, roleLabel: ROLES[u.role] ?? u.role, orgId: u.orgId, phone: u.phone, status: u.status, preferredLocale: u.preferredLocale ?? "ar" };
}

router.get("/auth/status", async (_req, res) => {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  res.json({ hasUsers: (row?.count ?? 0) > 0 });
});

/* ── Register (create org + admin user, starts 3-month trial) ── */
router.post("/auth/register", async (req, res): Promise<void> => {
  const { fullName, email, password, confirmPassword, officeName, phone } = req.body as {
    fullName: string; email: string; password: string; confirmPassword: string;
    officeName: string; phone?: string;
  };
  if (!fullName || !email || !password || !officeName) {
    res.status(400).json({ error: "جميع الحقول الإلزامية مطلوبة" }); return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: "كلمة المرور وتأكيدها غير متطابقتين" }); return;
  }
  if (password.length < 12) {
    res.status(400).json({ error: "كلمة المرور يجب أن تكون 12 حرفاً على الأقل" }); return;
  }
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "هذا البريد الإلكتروني مسجّل بالفعل" }); return;
  }
  const trialStart = new Date();
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + 90);
  const [org] = await db.insert(organizationsTable).values({
    name: officeName.trim(), subscriptionPlan: "solo", subscriptionStatus: "trial",
    billingCycle: "monthly", trialStartDate: trialStart, trialEndDate: trialEnd,
  }).returning();
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    email, passwordHash, name: fullName.trim(), role: "admin", phone, orgId: org.id, status: "active",
  }).returning();
  await db.update(organizationsTable).set({ ownerId: user.id }).where(eq(organizationsTable.id, org.id));
  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role, orgId: org.id });
  res.status(201).json({ token, user: fmtUser(user) });
});

/* ── Setup (first-run: kept for backward compat, creates org too) ── */
router.post("/auth/setup", async (req, res): Promise<void> => {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  if ((row?.count ?? 0) > 0) {
    res.status(400).json({ error: "يوجد مستخدم بالفعل" }); return;
  }
  const { email, password, name, officeName } = req.body as { email: string; password: string; name: string; officeName?: string };
  if (!email || !password || !name) {
    res.status(400).json({ error: "جميع الحقول مطلوبة" }); return;
  }
  const trialStart = new Date();
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + 90);
  const [org] = await db.insert(organizationsTable).values({
    name: officeName?.trim() ?? name.trim(), subscriptionPlan: "solo", subscriptionStatus: "trial",
    billingCycle: "monthly", trialStartDate: trialStart, trialEndDate: trialEnd,
  }).returning();
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name, role: "admin", orgId: org.id, status: "active" }).returning();
  await db.update(organizationsTable).set({ ownerId: user.id }).where(eq(organizationsTable.id, org.id));
  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role, orgId: org.id });
  res.json({ token, user: fmtUser(user) });
});

/* ── Login ── */
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }); return;
  }
  let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) { res.status(401).json({ error: "بيانات غير صحيحة" }); return; }
  if (user.status === "suspended") { res.status(403).json({ error: "حسابك موقوف. تواصل مع المدير" }); return; }
  if (user.status === "archived") { res.status(403).json({ error: "هذا الحساب محذوف" }); return; }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "بيانات غير صحيحة" }); return; }

  /* Auto-provision org for legacy users without one */
  if (!user.orgId) {
    const trialStart = new Date();
    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + 90);
    const [org] = await db.insert(organizationsTable).values({
      name: user.name || user.email,
      subscriptionPlan: "solo",
      subscriptionStatus: "trial",
      billingCycle: "monthly",
      trialStartDate: trialStart,
      trialEndDate: trialEnd,
      ownerId: user.id,
    }).returning();
    [user] = await db.update(usersTable).set({ orgId: org.id }).where(eq(usersTable.id, user.id)).returning();
  }

  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role, orgId: user.orgId ?? undefined });
  res.json({ token, user: fmtUser(user) });
});

/* ── Me ── */
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const u = (req as typeof req & { user: { id: number } }).user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, u.id));
  if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  res.json(fmtUser(user));
});

/* ── Create collaborator (admin, old endpoint) ── */
router.post("/auth/users", requireAuth, async (req, res): Promise<void> => {
  const actor = (req as typeof req & { user: { role: string; orgId?: number } }).user;
  if (actor.role !== "admin") { res.status(403).json({ error: "غير مصرح لك" }); return; }
  const { email, password, name, role } = req.body as { email: string; password: string; name: string; role: string };
  if (!email || !password || !name) { res.status(400).json({ error: "جميع الحقول مطلوبة" }); return; }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name, role: role ?? "lawyer", orgId: actor.orgId, status: "active" }).returning();
  res.status(201).json(fmtUser(user));
});

/* ── List users (admin) ── */
router.get("/auth/users", requireAuth, async (req, res) => {
  const actor = (req as typeof req & { user: { orgId?: number } }).user;
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.orgId, actor.orgId ?? 0));
  res.json(rows.map(fmtUser));
});

/* ── Update own profile ── */
router.patch("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const u = (req as typeof req & { user: { id: number; orgId?: number } }).user;
  const { name, email, currentPassword, newPassword, preferred_locale } = req.body as {
    name?: string; email?: string; currentPassword?: string; newPassword?: string; preferred_locale?: string;
  };
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, u.id));
  if (!existing) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  if (newPassword) {
    if (!currentPassword) { res.status(400).json({ error: "كلمة المرور الحالية مطلوبة" }); return; }
    const valid = await bcrypt.compare(currentPassword, existing.passwordHash);
    if (!valid) { res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" }); return; }
  }
  const updates: Partial<{ name: string; email: string; passwordHash: string; preferredLocale: string }> = {};
  if (name?.trim()) updates.name = name.trim();
  if (email?.trim()) updates.email = email.trim();
  if (newPassword) updates.passwordHash = await bcrypt.hash(newPassword, 10);
  if (preferred_locale === "ar" || preferred_locale === "fr") updates.preferredLocale = preferred_locale;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "لا توجد تغييرات" }); return; }
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, u.id)).returning();
  const token = signToken({ id: updated.id, email: updated.email, name: updated.name, role: updated.role, orgId: u.orgId });
  res.json({ token, user: fmtUser(updated) });
});

/* ── Forgot password: returns reset token (no email server) ── */
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body as { email: string };
  if (!email) { res.status(400).json({ error: "البريد الإلكتروني مطلوب" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.json({ message: "إذا كان البريد الإلكتروني مسجّلاً، ستجد رابط إعادة التعيين أدناه", token: null });
    return;
  }
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(passwordResetsTable).values({ userId: user.id, token, expiresAt });
  res.json({ message: "تم توليد رابط إعادة تعيين كلمة المرور", token });
});

/* ── Reset password ── */
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password, confirmPassword } = req.body as { token: string; password: string; confirmPassword: string };
  if (!token || !password) { res.status(400).json({ error: "الرابط وكلمة المرور مطلوبان" }); return; }
  if (password !== confirmPassword) { res.status(400).json({ error: "كلمتا المرور غير متطابقتين" }); return; }
  if (password.length < 12) { res.status(400).json({ error: "كلمة المرور يجب أن تكون 12 حرفاً على الأقل" }); return; }
  const [reset] = await db.select().from(passwordResetsTable)
    .where(and(eq(passwordResetsTable.token, token), isNull(passwordResetsTable.usedAt)));
  if (!reset) { res.status(400).json({ error: "رابط غير صالح أو مستخدم بالفعل" }); return; }
  if (new Date() > reset.expiresAt) { res.status(400).json({ error: "انتهت صلاحية الرابط (ساعة واحدة)" }); return; }
  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, reset.userId));
  await db.update(passwordResetsTable).set({ usedAt: new Date() }).where(eq(passwordResetsTable.id, reset.id));
  res.json({ message: "تم تغيير كلمة المرور بنجاح" });
});

export default router;
