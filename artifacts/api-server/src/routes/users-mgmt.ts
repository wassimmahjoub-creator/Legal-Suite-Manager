import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import type { AuthPayload } from "../middleware/auth.js";

const router = Router();

const ROLES: Record<string, string> = {
  admin: "مدير",
  partner: "شريك",
  lawyer: "محامي",
  secretary: "سكرتيرة",
  trainee: "متربص",
  accountant: "محاسب",
};

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  admin: { viewCases: true, editCases: true, deleteCases: true, createInvoices: true, viewAccounting: true, manageUsers: true, exportDocuments: true, manageTemplates: true },
  partner: { viewCases: true, editCases: true, deleteCases: true, createInvoices: true, viewAccounting: true, manageUsers: false, exportDocuments: true, manageTemplates: true },
  lawyer: { viewCases: true, editCases: true, deleteCases: false, createInvoices: true, viewAccounting: false, manageUsers: false, exportDocuments: true, manageTemplates: false },
  secretary: { viewCases: true, editCases: false, deleteCases: false, createInvoices: true, viewAccounting: false, manageUsers: false, exportDocuments: true, manageTemplates: false },
  trainee: { viewCases: true, editCases: false, deleteCases: false, createInvoices: false, viewAccounting: false, manageUsers: false, exportDocuments: false, manageTemplates: false },
  accountant: { viewCases: false, editCases: false, deleteCases: false, createInvoices: true, viewAccounting: true, manageUsers: false, exportDocuments: true, manageTemplates: false },
};

function getUser(req: Express.Request) {
  return (req as typeof req & { user: AuthPayload }).user;
}

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    roleLabel: ROLES[u.role] ?? u.role,
    status: u.status,
    orgId: u.orgId,
    permissions: u.permissions ?? DEFAULT_PERMISSIONS[u.role] ?? {},
    createdAt: u.createdAt,
  };
}

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);
  if (!u.orgId) { res.json([]); return; }
  const rows = await db.select().from(usersTable).where(eq(usersTable.orgId, u.orgId));
  res.json(rows.filter(r => r.status !== "archived").map(formatUser));
});

router.post("/users", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);
  if (u.role !== "admin") { res.status(403).json({ error: "غير مصرح لك" }); return; }
  if (!u.orgId) { res.status(400).json({ error: "لا يوجد مكتب" }); return; }
  const { name, email, password, role, phone } = req.body as { name: string; email: string; password: string; role: string; phone?: string };
  if (!name || !email || !password) { res.status(400).json({ error: "جميع الحقول مطلوبة" }); return; }
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) { res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" }); return; }
  const passwordHash = await bcrypt.hash(password, 10);
  const [newUser] = await db.insert(usersTable).values({
    name, email, passwordHash, role: role ?? "lawyer", phone, orgId: u.orgId, status: "active",
  }).returning();
  res.status(201).json(formatUser(newUser));
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);
  if (u.role !== "admin") { res.status(403).json({ error: "غير مصرح لك" }); return; }
  const targetId = parseInt(String(req.params["id"] ?? "0"));
  const [target] = await db.select().from(usersTable).where(and(eq(usersTable.id, targetId), eq(usersTable.orgId, u.orgId!)));
  if (!target) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  if (target.role === "admin" && target.id !== u.id && req.body.role && req.body.role !== "admin") {
    res.status(400).json({ error: "لا يمكن تغيير دور المدير الرئيسي" }); return;
  }
  const { name, role, phone, status, permissions } = req.body as {
    name?: string; role?: string; phone?: string; status?: string; permissions?: Record<string, boolean>;
  };
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name?.trim()) updates.name = name.trim();
  if (role) updates.role = role;
  if (phone !== undefined) updates.phone = phone;
  if (status) updates.status = status;
  if (permissions) updates.permissions = permissions;
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, targetId)).returning();
  res.json(formatUser(updated));
});

router.delete("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);
  if (u.role !== "admin") { res.status(403).json({ error: "غير مصرح لك" }); return; }
  const targetId = parseInt(String(req.params["id"] ?? "0"));
  if (targetId === u.id) { res.status(400).json({ error: "لا يمكنك حذف حسابك الخاص" }); return; }
  const [target] = await db.select().from(usersTable).where(and(eq(usersTable.id, targetId), eq(usersTable.orgId, u.orgId!)));
  if (!target) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  await db.update(usersTable).set({ status: "archived" }).where(eq(usersTable.id, targetId));
  res.json({ success: true });
});

router.post("/users/:id/reset-password", requireAuth, async (req, res): Promise<void> => {
  const u = getUser(req);
  if (u.role !== "admin") { res.status(403).json({ error: "غير مصرح لك" }); return; }
  const targetId = parseInt(String(req.params["id"] ?? "0"));
  const [target] = await db.select().from(usersTable).where(and(eq(usersTable.id, targetId), eq(usersTable.orgId, u.orgId!)));
  if (!target) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  const { newPassword } = req.body as { newPassword: string };
  if (!newPassword || newPassword.length < 6) { res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }); return; }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, targetId));
  res.json({ success: true });
});

export default router;
