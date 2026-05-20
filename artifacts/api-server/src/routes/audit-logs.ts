import { Router } from "express";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { and, desc, eq, gte, ilike, inArray, lte } from "drizzle-orm";
import { requireAuth, getActor } from "../middleware/auth.js";

const router = Router();

router.get("/audit-logs", requireAuth, async (req, res) => {
  const actor = getActor(req);
  const orgId = actor.orgId ?? 0;
  const { entityType, userName, from, to } = req.query as Record<string, string>;

  const orgUsers = db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.orgId, orgId));

  const conditions: ReturnType<typeof eq>[] = [
    inArray(auditLogsTable.userId, orgUsers) as ReturnType<typeof eq>,
  ];
  if (entityType) conditions.push(eq(auditLogsTable.entityType, entityType));
  if (userName)   conditions.push(ilike(auditLogsTable.userName, `%${userName}%`) as ReturnType<typeof eq>);
  if (from)       conditions.push(gte(auditLogsTable.createdAt, new Date(from)) as ReturnType<typeof eq>);
  if (to)         conditions.push(lte(auditLogsTable.createdAt, new Date(to + "T23:59:59")) as ReturnType<typeof eq>);

  const rows = await db
    .select()
    .from(auditLogsTable)
    .where(and(...(conditions as [ReturnType<typeof eq>, ...ReturnType<typeof eq>[]])))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(200);

  res.json(rows);
});

export async function logAudit(opts: {
  entityType: string;
  entityId?: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  userId?: number;
  userName?: string;
  ipAddress?: string;
}) {
  await db.insert(auditLogsTable).values({
    entityType: opts.entityType,
    entityId:   opts.entityId   ?? null,
    action:     opts.action,
    oldValue:   opts.oldValue   ?? null,
    newValue:   opts.newValue   ?? null,
    userId:     opts.userId     ?? null,
    userName:   opts.userName   ?? null,
    ipAddress:  opts.ipAddress  ?? null,
  }).catch(() => {});
}

export default router;
