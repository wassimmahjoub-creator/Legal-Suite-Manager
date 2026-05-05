import { Router } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { CreateClientBody, UpdateClientBody } from "@workspace/api-zod";

const router = Router();

router.get("/clients", async (req, res) => {
  const { search } = req.query as { search?: string };
  let clients;
  if (search) {
    clients = await db.select().from(clientsTable).where(ilike(clientsTable.name, `%${search}%`));
  } else {
    clients = await db.select().from(clientsTable).orderBy(clientsTable.createdAt);
  }
  res.json(clients);
});

router.post("/clients", async (req, res) => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [client] = await db.insert(clientsTable).values(parsed.data).returning();
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
  const [client] = await db.update(clientsTable).set(parsed.data).where(eq(clientsTable.id, id)).returning();
  if (!client) return res.status(404).json({ error: "Not found" });
  res.json(client);
});

router.delete("/clients/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(clientsTable).where(eq(clientsTable.id, id));
  res.status(204).send();
});

export default router;
