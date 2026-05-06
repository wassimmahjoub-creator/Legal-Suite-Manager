import { Router } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/audit-logs", requireAuth, async (req, res) => {
  const { entityType, userName, from, to } = req.query as Record<string, string>;
  let rows = await db.select().from(auditLogsTable).orderBy(auditLogsTable.createdAt);
  if (entityType) rows = rows.filter(r => r.entityType === entityType);
  if (userName) rows = rows.filter(r => r.userName?.includes(userName));
  if (from) rows = rows.filter(r => new Date(r.createdAt) >= new Date(from));
  if (to) rows = rows.filter(r => new Date(r.createdAt) <= new Date(to + "T23:59:59"));
  res.json(rows.reverse().slice(0, 200));
});

export async function logAudit(opts: {
  entityType: string; entityId?: number; action: string;
  oldValue?: string; newValue?: string; userName?: string; ipAddress?: string;
}) {
  await db.insert(auditLogsTable).values({
    entityType: opts.entityType,
    entityId: opts.entityId ?? null,
    action: opts.action,
    oldValue: opts.oldValue ?? null,
    newValue: opts.newValue ?? null,
    userName: opts.userName ?? null,
    ipAddress: opts.ipAddress ?? null,
  }).catch(() => {});
}

export default router;
