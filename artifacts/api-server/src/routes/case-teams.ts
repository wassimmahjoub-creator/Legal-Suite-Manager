import { Router } from "express";
import { db, caseTeamsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/cases/:caseId/team", requireAuth, async (req, res) => {
  const caseId = Number(req.params.caseId);
  const rows = await db.select({
    id: caseTeamsTable.id,
    caseId: caseTeamsTable.caseId,
    userId: caseTeamsTable.userId,
    role: caseTeamsTable.role,
    userName: usersTable.name,
    userEmail: usersTable.email,
    userRole: usersTable.role,
    createdAt: caseTeamsTable.createdAt,
  }).from(caseTeamsTable)
    .leftJoin(usersTable, eq(caseTeamsTable.userId, usersTable.id))
    .where(eq(caseTeamsTable.caseId, caseId));
  res.json(rows);
});

router.post("/cases/:caseId/team", requireAuth, async (req, res): Promise<void> => {
  const caseId = Number(req.params.caseId);
  const { userId, role } = req.body as Record<string, string>;
  if (!userId) { res.status(400).json({ error: "المستخدم مطلوب" }); return; }
  const [row] = await db.insert(caseTeamsTable).values({ caseId, userId: Number(userId), role: role ?? "مساعد" }).returning();
  res.status(201).json(row);
});

router.delete("/case-teams/:id", requireAuth, async (req, res) => {
  await db.delete(caseTeamsTable).where(eq(caseTeamsTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
