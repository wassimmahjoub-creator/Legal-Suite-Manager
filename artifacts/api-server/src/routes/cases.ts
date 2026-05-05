import { Router } from "express";
import { db, casesTable, clientsTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { CreateCaseBody, UpdateCaseBody } from "@workspace/api-zod";

const router = Router();

router.get("/cases", async (req, res) => {
  const { status, court, lawyerId, clientId, search } = req.query as Record<string, string>;
  const rows = await db
    .select({
      id: casesTable.id,
      title: casesTable.title,
      clientId: casesTable.clientId,
      clientName: clientsTable.name,
      status: casesTable.status,
      court: casesTable.court,
      lawyer: casesTable.lawyer,
      nextHearing: casesTable.nextHearing,
      description: casesTable.description,
      notes: casesTable.notes,
      createdAt: casesTable.createdAt,
    })
    .from(casesTable)
    .leftJoin(clientsTable, eq(casesTable.clientId, clientsTable.id))
    .orderBy(casesTable.createdAt);

  let filtered = rows;
  if (status) filtered = filtered.filter((r) => r.status === status);
  if (court) filtered = filtered.filter((r) => r.court === court);
  if (clientId) filtered = filtered.filter((r) => r.clientId === Number(clientId));
  if (search) filtered = filtered.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()));

  res.json(filtered);
});

router.post("/cases", async (req, res) => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [row] = await db.insert(casesTable).values(parsed.data).returning();
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));
  res.status(201).json({ ...row, clientName: client?.name ?? "" });
});

router.get("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .select({
      id: casesTable.id,
      title: casesTable.title,
      clientId: casesTable.clientId,
      clientName: clientsTable.name,
      status: casesTable.status,
      court: casesTable.court,
      lawyer: casesTable.lawyer,
      nextHearing: casesTable.nextHearing,
      description: casesTable.description,
      notes: casesTable.notes,
      createdAt: casesTable.createdAt,
    })
    .from(casesTable)
    .leftJoin(clientsTable, eq(casesTable.clientId, clientsTable.id))
    .where(eq(casesTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.put("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [row] = await db.update(casesTable).set(parsed.data).where(eq(casesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));
  res.json({ ...row, clientName: client?.name ?? "" });
});

router.delete("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(casesTable).where(eq(casesTable.id, id));
  res.status(204).send();
});

export default router;
