import { Router } from "express";
import { db, eventsTable, casesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateEventBody, UpdateEventBody } from "@workspace/api-zod";

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
      type: eventsTable.type,
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
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [row] = await db.insert(eventsTable).values(parsed.data).returning();
  res.status(201).json({ ...row, caseName: null });
});

router.put("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [row] = await db.update(eventsTable).set(parsed.data).where(eq(eventsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, caseName: null });
});

router.delete("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.status(204).send();
});

export default router;
