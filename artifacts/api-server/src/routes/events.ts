import { Router } from "express";
import { db, eventsTable, casesTable, insertEventSchema } from "@workspace/db";
import { eq, and, gte, lte, SQL } from "drizzle-orm";
import { CaseEventLogger } from "../services/caseEventLogger.js";
import { getActor } from "../middleware/auth.js";
import { logAudit } from "./audit-logs.js";

const router = Router();

const withJoins = () =>
  db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      caseId: eventsTable.caseId,
      caseName: casesTable.title,
      date: eventsTable.date,
      time: eventsTable.time,
      location: eventsTable.location,
      court: eventsTable.court,
      division: eventsTable.division,
      type: eventsTable.type,
      objective: eventsTable.objective,
      result: eventsTable.result,
      legalStatus: eventsTable.legalStatus,
      postponedTo: eventsTable.postponedTo,
      notes: eventsTable.notes,
      createdAt: eventsTable.createdAt,
    })
    .from(eventsTable)
    .leftJoin(casesTable, eq(eventsTable.caseId, casesTable.id));

router.get("/events", async (req, res) => {
  const { caseId, from, to } = req.query as Record<string, string>;
  const page  = Math.max(0, parseInt((req.query.page  as string) ?? "0") || 0);
  const limit = Math.min(500, Math.max(1, parseInt((req.query.limit as string) ?? "100") || 100));

  const actor = (req as typeof req & { user: { orgId?: number } }).user;
  const conditions: SQL[] = [eq(eventsTable.orgId, actor.orgId ?? 0)];
  if (caseId) conditions.push(eq(eventsTable.caseId, Number(caseId)));
  if (from)   conditions.push(gte(eventsTable.date, from));
  if (to)     conditions.push(lte(eventsTable.date, to));

  const rows = await withJoins()
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(eventsTable.date)
    .limit(limit)
    .offset(page * limit);

  res.json(rows);
});

router.post("/events", async (req, res) => {
  const parsed = insertEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const actor = getActor(req);
  const [row] = await db.insert(eventsTable).values({
    ...parsed.data,
    orgId: actor.orgId ?? 0,
  }).returning();
  if (row.caseId && (row.type === "audience" || row.type === "hearing" || !row.type || row.type === "other")) {
    void CaseEventLogger.log({
      caseId: row.caseId, eventType: "hearing_scheduled",
      occurredAt: row.date ? new Date(row.date) : new Date(),
      titleAr: `برمجة جلسة${row.title ? `: ${row.title}` : ""}`,
      metadata: { date: row.date ?? "", location: row.court ?? "" },
      relatedEntityType: "hearing", relatedEntityId: row.id,
    });
  }
  void logAudit({
    entityType: "event", entityId: row.id, action: "create",
    newValue: row.title ?? row.date ?? undefined,
    userId: actor?.id, userName: actor?.name,
  });
  res.status(201).json({ ...row, caseName: null });
});

router.put("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  const actor = getActor(req);
  const parsed = insertEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [row] = await db.update(eventsTable).set(parsed.data)
    .where(and(eq(eventsTable.id, id), eq(eventsTable.orgId, actor?.orgId ?? 0))).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  void logAudit({
    entityType: "event", entityId: id, action: "update",
    newValue: row.title ?? row.date ?? undefined,
    userId: actor?.id, userName: actor?.name,
  });
  res.json({ ...row, caseName: null });
});

// ── PATCH for drag & drop (date/time only) ────────────────────────────────────

router.patch("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const body = req.body as Record<string, unknown>;
  const updates: Partial<typeof eventsTable.$inferSelect> = {};
  if (typeof body.date === "string") updates.date = body.date;
  if (typeof body.time === "string" || body.time === null) updates.time = body.time as string | null;
  if (typeof body.duration === "number") updates.duration = body.duration;
  const [row] = await db.update(eventsTable).set(updates)
    .where(and(eq(eventsTable.id, id), eq(eventsTable.orgId, actor?.orgId ?? 0))).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  const actor = getActor(req);
  const [toDelete] = await db.select({ title: eventsTable.title, date: eventsTable.date })
    .from(eventsTable).where(and(eq(eventsTable.id, id), eq(eventsTable.orgId, actor?.orgId ?? 0)));
  await db.delete(eventsTable).where(and(eq(eventsTable.id, id), eq(eventsTable.orgId, actor?.orgId ?? 0)));
  void logAudit({
    entityType: "event", entityId: id, action: "delete",
    oldValue: toDelete ? (toDelete.title ?? toDelete.date ?? String(id)) : String(id),
    userId: actor?.id, userName: actor?.name,
  });
  res.status(204).send();
});

export default router;
