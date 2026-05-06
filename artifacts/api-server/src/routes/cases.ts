import { Router } from "express";
import { db, casesTable, clientsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { CreateCaseBody, UpdateCaseBody } from "@workspace/api-zod";

const router = Router();

const caseFields = {
  id: casesTable.id,
  caseNumber: casesTable.caseNumber,
  title: casesTable.title,
  clientId: casesTable.clientId,
  clientName: clientsTable.name,
  status: casesTable.status,
  court: casesTable.court,
  division: casesTable.division,
  lawyer: casesTable.lawyer,
  nextHearing: casesTable.nextHearing,
  description: casesTable.description,
  notes: casesTable.notes,
  procedureStage: casesTable.procedureStage,
  archivedAt: casesTable.archivedAt,
  deletedAt: casesTable.deletedAt,
  createdAt: casesTable.createdAt,
};

router.get("/cases", async (req, res) => {
  const { status, court, clientId, search, archived } = req.query as Record<string, string>;
  const rows = await db
    .select(caseFields)
    .from(casesTable)
    .leftJoin(clientsTable, eq(casesTable.clientId, clientsTable.id))
    .where(isNull(casesTable.deletedAt))
    .orderBy(casesTable.createdAt);

  let filtered = rows;
  if (archived === "true") {
    filtered = filtered.filter((r) => r.archivedAt !== null);
  } else if (archived !== "all") {
    filtered = filtered.filter((r) => r.archivedAt === null);
  }
  if (status) filtered = filtered.filter((r) => r.status === status);
  if (court) filtered = filtered.filter((r) => r.court === court);
  if (clientId) filtered = filtered.filter((r) => r.clientId === Number(clientId));
  if (search) filtered = filtered.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.caseNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (r.clientName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  res.json(filtered);
});

router.post("/cases", async (req, res) => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const [count] = await db.select({ max: casesTable.id }).from(casesTable);
  const year = new Date().getFullYear();
  const caseNumber = `${year}-${String((count?.max ?? 0) + 1).padStart(4, "0")}`;

  const [row] = await db.insert(casesTable).values({ ...parsed.data, caseNumber }).returning();
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));
  res.status(201).json({ ...row, clientName: client?.name ?? "" });
});

router.get("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .select(caseFields)
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

router.patch("/cases/:id/archive", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const archivedAt = row.archivedAt ? null : new Date();
  await db.update(casesTable).set({ archivedAt, status: archivedAt ? "archived" : "active" }).where(eq(casesTable.id, id));
  res.json({ archived: !!archivedAt });
});

router.patch("/cases/:id/soft-delete", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.update(casesTable).set({ deletedAt: new Date() }).where(eq(casesTable.id, id));
  res.json({ deleted: true });
});

router.delete("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(casesTable).where(eq(casesTable.id, id));
  res.status(204).send();
});

export default router;
