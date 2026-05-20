import { Router } from "express";
import { db, tasksTable, casesTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { CreateTaskBody, UpdateTaskBody } from "@workspace/api-zod";
import { getActor } from "../middleware/auth.js";

const router = Router();

router.get("/tasks", async (req, res) => {
  const actor = getActor(req);
  const orgId = actor.orgId ?? 0;
  const { caseId, done } = req.query as Record<string, string>;

  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));

  let rows = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      caseId: tasksTable.caseId,
      caseName: casesTable.title,
      done: tasksTable.done,
      dueDate: tasksTable.dueDate,
      createdAt: tasksTable.createdAt,
    })
    .from(tasksTable)
    .leftJoin(casesTable, eq(tasksTable.caseId, casesTable.id))
    .where(inArray(tasksTable.caseId, orgCases))
    .orderBy(tasksTable.createdAt);

  if (caseId) rows = rows.filter((r) => r.caseId === Number(caseId));
  if (done !== undefined) rows = rows.filter((r) => r.done === (done === "true"));
  res.json(rows);
});

router.post("/tasks", async (req, res) => {
  const actor = getActor(req);
  const orgId = actor.orgId ?? 0;
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  if (parsed.data.caseId) {
    const [c] = await db.select({ id: casesTable.id }).from(casesTable)
      .where(and(eq(casesTable.id, parsed.data.caseId), eq(casesTable.orgId, orgId)));
    if (!c) return res.status(403).json({ error: "غير مصرح" });
  }

  const [row] = await db.insert(tasksTable).values(parsed.data).returning();
  res.status(201).json({ ...row, caseName: null });
});

router.put("/tasks/:id", async (req, res) => {
  const actor = getActor(req);
  const orgId = actor.orgId ?? 0;
  const id = Number(req.params.id);
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));
  const [own] = await db.select({ id: tasksTable.id }).from(tasksTable)
    .where(and(eq(tasksTable.id, id), inArray(tasksTable.caseId, orgCases)));
  if (!own) return res.status(404).json({ error: "غير موجود" });

  const [row] = await db.update(tasksTable).set(parsed.data).where(eq(tasksTable.id, id)).returning();
  res.json({ ...row, caseName: null });
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const actor = getActor(req);
  const orgId = actor.orgId ?? 0;
  const id = Number(req.params.id);

  const orgCases = db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.orgId, orgId));
  const [own] = await db.select({ id: tasksTable.id }).from(tasksTable)
    .where(and(eq(tasksTable.id, id), inArray(tasksTable.caseId, orgCases)));
  if (!own) { res.status(404).json({ error: "غير موجود" }); return; }

  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.status(204).send();
});

export default router;
