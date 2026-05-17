import { Router } from "express";
import { db, eventsTable, casesTable, insertEventSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

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
  let rows = await withJoins().orderBy(eventsTable.date);
  if (caseId) rows = rows.filter((r) => r.caseId === Number(caseId));
  if (from) rows = rows.filter((r) => r.date >= from);
  if (to) rows = rows.filter((r) => r.date <= to);
  res.json(rows);
});

router.post("/events", async (req, res) => {
  const parsed = insertEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [row] = await db.insert(eventsTable).values(parsed.data).returning();
  res.status(201).json({ ...row, caseName: null });
});

router.put("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = insertEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [row] = await db.update(eventsTable).set(parsed.data).where(eq(eventsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, caseName: null });
});

// ── PATCH for drag & drop (date/time only) ────────────────────────────────────

router.patch("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  const updates: Partial<typeof eventsTable.$inferSelect> = {};
  if (typeof body.date === "string") updates.date = body.date;
  if (typeof body.time === "string" || body.time === null) updates.time = body.time as string | null;
  if (typeof body.duration === "number") updates.duration = body.duration;
  const [row] = await db.update(eventsTable).set(updates).where(eq(eventsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.status(204).send();
});

export default router;
