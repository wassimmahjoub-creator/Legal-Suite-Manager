import { Router } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq, ilike, isNull, sql, like } from "drizzle-orm";
import { CreateClientBody, UpdateClientBody } from "@workspace/api-zod";

const router = Router();

function extractExtras(body: Record<string, unknown>) {
  const str = (key: string) => typeof body[key] === "string" ? (body[key] as string) || null : null;
  return {
    clientType: str("clientType") ?? "individual",
    cin: str("cin"),
    taxId: str("taxId"),
    officeSeq: str("officeSeq"),
  };
}

router.get("/clients", async (req, res) => {
  const { search } = req.query as { search?: string };
  let clients;
  if (search) {
    clients = await db.select().from(clientsTable)
      .where(ilike(clientsTable.name, `%${search}%`));
  } else {
    clients = await db.select().from(clientsTable)
      .where(isNull(clientsTable.deletedAt))
      .orderBy(clientsTable.createdAt);
  }
  res.json(clients);
});

router.post("/clients", async (req, res) => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const year = new Date().getFullYear();
  const yearPrefix = `${year}/`;
  const [count] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(clientsTable)
    .where(like(clientsTable.officeSeq, `${yearPrefix}%`));
  const next = (count?.cnt ?? 0) + 1;
  const officeSeq = `${year}/${String(next).padStart(3, "0")}`;

  const extras = extractExtras(req.body as Record<string, unknown>);
  const [client] = await db.insert(clientsTable).values({
    ...parsed.data,
    ...extras,
    officeSeq: extras.officeSeq ?? officeSeq,
  }).returning();
  res.status(201).json(client);
});

router.get("/clients/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
  if (!client) return res.status(404).json({ error: "Not found" });
  res.json(client);
});

router.put("/clients/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const extras = extractExtras(req.body as Record<string, unknown>);
  const [client] = await db.update(clientsTable).set({ ...parsed.data, ...extras }).where(eq(clientsTable.id, id)).returning();
  if (!client) return res.status(404).json({ error: "Not found" });
  res.json(client);
});

router.patch("/clients/:id/soft-delete", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.update(clientsTable).set({ deletedAt: new Date() }).where(eq(clientsTable.id, id));
  res.json({ deleted: true });
});

router.delete("/clients/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(clientsTable).where(eq(clientsTable.id, id));
  res.status(204).send();
});

export default router;
