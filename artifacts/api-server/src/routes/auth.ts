import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

const ROLES: Record<string, string> = {
  admin: "مدير",
  lawyer: "محامي",
  secretary: "سكرتيرة",
  trainee: "متربص",
  accountant: "محاسب",
};

router.get("/auth/status", async (_req, res) => {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  res.json({ hasUsers: (row?.count ?? 0) > 0 });
});

router.post("/auth/setup", async (req, res): Promise<void> => {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  if ((row?.count ?? 0) > 0) {
    res.status(400).json({ error: "يوجد مستخدم بالفعل" });
    return;
  }
  const { email, password, name } = req.body as { email: string; password: string; name: string };
  if (!email || !password || !name) {
    res.status(400).json({ error: "جميع الحقول مطلوبة" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name, role: "admin" }).returning();
  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, roleLabel: ROLES[user.role] ?? user.role } });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "بيانات غير صحيحة" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "بيانات غير صحيحة" });
    return;
  }
  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, roleLabel: ROLES[user.role] ?? user.role } });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const u = (req as typeof req & { user: { id: number } }).user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, u.id));
  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, roleLabel: ROLES[user.role] ?? user.role });
});

router.post("/auth/users", requireAuth, async (req, res): Promise<void> => {
  const actor = (req as typeof req & { user: { role: string } }).user;
  if (actor.role !== "admin") {
    res.status(403).json({ error: "غير مصرح لك" });
    return;
  }
  const { email, password, name, role } = req.body as { email: string; password: string; name: string; role: string };
  if (!email || !password || !name) {
    res.status(400).json({ error: "جميع الحقول مطلوبة" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name, role: role ?? "lawyer" }).returning();
  res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

router.get("/auth/users", requireAuth, async (_req, res) => {
  const rows = await db.select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, createdAt: usersTable.createdAt }).from(usersTable);
  res.json(rows.map(u => ({ ...u, roleLabel: ROLES[u.role] ?? u.role })));
});

export default router;
