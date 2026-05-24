import { Router } from "express";
import { db, caseTeamsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { CaseEventLogger } from "../services/caseEventLogger.js";
import type { AuthPayload } from "../middleware/auth.js";

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
  const actor = (req as typeof req & { user?: AuthPayload }).user;
  // Look up the added user's name
  const [added] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, Number(userId)));
  void CaseEventLogger.log({
    caseId, eventType: "team_member_added", actorUserId: actor?.id ?? null,
    metadata: { user_name: added?.name ?? "", role },
    relatedEntityType: "team_member", relatedEntityId: row.id,
  });
  res.status(201).json(row);
});

router.put("/case-teams/:id", requireAuth, async (req, res) => {
  const teamId = Number(req.params.id);
  const { role, userId } = req.body as { role: string; userId?: number };
  const updateData: Record<string, unknown> = { role };
  if (userId) updateData.userId = userId;
  const [row] = await db.update(caseTeamsTable).set(updateData).where(eq(caseTeamsTable.id, teamId)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.delete("/case-teams/:id", requireAuth, async (req, res) => {
  const teamId = Number(req.params.id);
  const [member] = await db.select({ caseId: caseTeamsTable.caseId, userId: caseTeamsTable.userId, name: usersTable.name })
    .from(caseTeamsTable).leftJoin(usersTable, eq(caseTeamsTable.userId, usersTable.id))
    .where(eq(caseTeamsTable.id, teamId));
  await db.delete(caseTeamsTable).where(eq(caseTeamsTable.id, teamId));
  if (member) {
    const actor = (req as typeof req & { user?: AuthPayload }).user;
    void CaseEventLogger.log({
      caseId: member.caseId, eventType: "team_member_removed", actorUserId: actor?.id ?? null,
      metadata: { user_name: member.name ?? "" },
    });
  }
  res.status(204).send();
});

export default router;
