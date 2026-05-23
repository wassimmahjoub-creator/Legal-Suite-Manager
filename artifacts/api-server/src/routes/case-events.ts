import { Router } from "express";
import { db, caseEventsTable, usersTable } from "@workspace/db";
import { eq, desc, and, gte, lte, ilike, or } from "drizzle-orm";
import { CaseEventLogger } from "../services/caseEventLogger.js";

const router = Router();

router.get("/cases/:caseId/events", async (req, res) => {
  const caseId = Number(req.params.caseId);
  const {
    cursor,
    limit: limitParam = "50",
    eventType,
    from,
    to,
    search,
    isSystem,
    count_only,
  } = req.query as Record<string, string>;

  // Fast count-only path for state detection
  if (count_only === "true") {
    const all = await db
      .select({ id: caseEventsTable.id })
      .from(caseEventsTable)
      .where(eq(caseEventsTable.caseId, caseId));
    res.json({ count: all.length });
    return;
  }

  const limit = Math.min(Number(limitParam) || 50, 200);

  const rows = await db
    .select({
      id: caseEventsTable.id,
      caseId: caseEventsTable.caseId,
      eventType: caseEventsTable.eventType,
      occurredAt: caseEventsTable.occurredAt,
      titleAr: caseEventsTable.titleAr,
      titleFr: caseEventsTable.titleFr,
      description: caseEventsTable.description,
      metadata: caseEventsTable.metadata,
      actorUserId: caseEventsTable.actorUserId,
      actorName: usersTable.name,
      relatedEntityType: caseEventsTable.relatedEntityType,
      relatedEntityId: caseEventsTable.relatedEntityId,
      isSystemGenerated: caseEventsTable.isSystemGenerated,
      createdAt: caseEventsTable.createdAt,
    })
    .from(caseEventsTable)
    .leftJoin(usersTable, eq(caseEventsTable.actorUserId, usersTable.id))
    .where(eq(caseEventsTable.caseId, caseId))
    .orderBy(desc(caseEventsTable.occurredAt))
    .limit(limit + 1);

  let filtered = rows;
  if (cursor) {
    const cursorDate = new Date(cursor);
    filtered = filtered.filter(r => r.occurredAt < cursorDate);
  }
  if (eventType) {
    const types = eventType.split(",");
    filtered = filtered.filter(r => types.includes(r.eventType));
  }
  if (from) filtered = filtered.filter(r => r.occurredAt >= new Date(from));
  if (to) filtered = filtered.filter(r => r.occurredAt <= new Date(to));
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.titleAr.toLowerCase().includes(s) ||
      (r.description ?? "").toLowerCase().includes(s)
    );
  }
  if (isSystem === "true") filtered = filtered.filter(r => r.isSystemGenerated);
  if (isSystem === "false") filtered = filtered.filter(r => !r.isSystemGenerated);

  const hasMore = filtered.length > limit;
  const page = filtered.slice(0, limit);
  const nextCursor = hasMore ? page[page.length - 1]?.occurredAt?.toISOString() : null;

  res.json({ events: page, nextCursor, hasMore });
});

router.post("/cases/:caseId/events", async (req, res): Promise<void> => {
  const caseId = Number(req.params.caseId);
  const user = (req as typeof req & { user?: { id: number } }).user;
  const { eventType, occurredAt, titleAr, titleFr, description, metadata } =
    req.body as Record<string, unknown>;

  const allowedManual = [
    "manual_entry", "judgment_recorded", "hearing_held",
    "consultation_held", "notice_sent", "contract_drafted", "contract_signed",
    "debt_stage_changed",
  ];
  if (!allowedManual.includes(eventType as string)) {
    res.status(400).json({ error: "نوع الحدث غير مسموح به للإدخال اليدوي" });
    return;
  }

  await CaseEventLogger.log({
    caseId,
    eventType: eventType as "manual_entry"|"judgment_recorded"|"hearing_held"|"consultation_held"|"notice_sent"|"contract_drafted"|"contract_signed"|"debt_stage_changed",
    occurredAt: occurredAt ? new Date(occurredAt as string) : new Date(),
    titleAr: titleAr as string,
    titleFr: titleFr as string | undefined,
    description: description as string | undefined,
    metadata: (metadata as Record<string, unknown>) ?? {},
    actorUserId: user?.id ?? null,
    isSystemGenerated: false,
  });

  res.status(201).json({ ok: true });
});

export default router;
