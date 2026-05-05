import { Router } from "express";
import { db, tasksTable, casesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateTaskBody, UpdateTaskBody } from "@workspace/api-zod";

const router = Router();

const withJoins = () =>
  db
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
    .leftJoin(casesTable, eq(tasksTable.caseId, casesTable.id));

router.get("/tasks", async (req, res) => {
  const { caseId, done } = req.query as Record<string, string>;
  let rows = await withJoins().orderBy(tasksTable.createdAt);
  if (caseId) rows = rows.filter((r) => r.caseId === Number(caseId));
  if (done !== undefined) rows = rows.filter((r) => r.done === (done === "true"));
  res.json(rows);
});

router.post("/tasks", async (req, res) => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [row] = await db.insert(tasksTable).values(parsed.data).returning();
  res.status(201).json({ ...row, caseName: null });
});

router.put("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [row] = await db.update(tasksTable).set(parsed.data).where(eq(tasksTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, caseName: null });
});

router.delete("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.status(204).send();
});

export default router;
