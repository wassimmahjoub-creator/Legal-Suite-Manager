import { Router } from "express";
import { db, correspondancesTable, clientsTable, casesTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { requireAuth, getActor } from "../middleware/auth.js";

const router = Router();

const orgClientIds = (orgId: number) =>
  db.select({ id: clientsTable.id }).from(clientsTable).where(eq(clientsTable.orgId, orgId));

const withRefs = () => db.select({
  id: correspondancesTable.id,
  clientId: correspondancesTable.clientId,
  caseId: correspondancesTable.caseId,
  clientName: clientsTable.name,
  caseName: casesTable.title,
  type: correspondancesTable.type,
  direction: correspondancesTable.direction,
  date: correspondancesTable.date,
  subject: correspondancesTable.subject,
  content: correspondancesTable.content,
  reference: correspondancesTable.reference,
  status: correspondancesTable.status,
  createdAt: correspondancesTable.createdAt,
}).from(correspondancesTable)
  .leftJoin(clientsTable, eq(correspondancesTable.clientId, clientsTable.id))
  .leftJoin(casesTable, eq(correspondancesTable.caseId, casesTable.id));

router.get("/correspondances", requireAuth, async (req, res) => {
  const { clientId, caseId } = req.query as Record<string, string>;
  const orgId = getActor(req).orgId ?? 0;
  let rows = await withRefs()
    .where(inArray(correspondancesTable.clientId, orgClientIds(orgId)))
    .orderBy(correspondancesTable.date);
  rows = rows.reverse();
  if (clientId) rows = rows.filter(r => r.clientId === Number(clientId));
  if (caseId)   rows = rows.filter(r => r.caseId   === Number(caseId));
  res.json(rows);
});

router.post("/correspondances", requireAuth, async (req, res): Promise<void> => {
  const orgId = getActor(req).orgId ?? 0;
  const { clientId, caseId, type, direction, date, subject, content, reference, status } = req.body as Record<string, string>;
  if (!clientId || !date || !subject) {
    res.status(400).json({ error: "الموكّل والتاريخ والموضوع مطلوبة" });
    return;
  }
  const [ownedClient] = await db.select({ id: clientsTable.id })
    .from(clientsTable)
    .where(and(eq(clientsTable.id, Number(clientId)), eq(clientsTable.orgId, orgId)));
  if (!ownedClient) { res.status(403).json({ error: "غير مصرّح" }); return; }

  if (caseId) {
    const [ownedCase] = await db.select({ id: casesTable.id })
      .from(casesTable)
      .where(and(eq(casesTable.id, Number(caseId)), eq(casesTable.orgId, orgId)));
    if (!ownedCase) { res.status(403).json({ error: "غير مصرّح" }); return; }
  }

  const [row] = await db.insert(correspondancesTable).values({
    clientId: Number(clientId),
    caseId: caseId ? Number(caseId) : null,
    type: type ?? "letter",
    direction: direction ?? "outgoing",
    date,
    subject,
    content: content ?? null,
    reference: reference ?? null,
    status: status ?? "sent",
  }).returning();
  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, Number(clientId)));
  const [cas] = caseId ? await db.select({ title: casesTable.title }).from(casesTable).where(eq(casesTable.id, Number(caseId))) : [null];
  res.status(201).json({ ...row, clientName: client?.name ?? null, caseName: cas?.title ?? null });
});

router.put("/correspondances/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const orgId = getActor(req).orgId ?? 0;
  const [own] = await db.select({ id: correspondancesTable.id })
    .from(correspondancesTable)
    .where(and(
      eq(correspondancesTable.id, id),
      inArray(correspondancesTable.clientId, orgClientIds(orgId)),
    ));
  if (!own) { res.status(404).json({ error: "غير موجود" }); return; }

  const { clientId, caseId, type, direction, date, subject, content, reference, status } = req.body as Record<string, string>;
  if (!clientId || !date || !subject) {
    res.status(400).json({ error: "الموكّل والتاريخ والموضوع مطلوبة" });
    return;
  }
  const [row] = await db.update(correspondancesTable).set({
    clientId: Number(clientId),
    caseId: caseId ? Number(caseId) : null,
    type, direction, date, subject,
    content: content ?? null,
    reference: reference ?? null,
    status,
  }).where(eq(correspondancesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, row.clientId));
  const cas = row.caseId ? await db.select({ title: casesTable.title }).from(casesTable).where(eq(casesTable.id, row.caseId)) : [];
  res.json({ ...row, clientName: client?.name ?? null, caseName: cas[0]?.title ?? null });
});

router.delete("/correspondances/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const orgId = getActor(req).orgId ?? 0;
  const [own] = await db.select({ id: correspondancesTable.id })
    .from(correspondancesTable)
    .where(and(
      eq(correspondancesTable.id, id),
      inArray(correspondancesTable.clientId, orgClientIds(orgId)),
    ));
  if (!own) { res.status(404).json({ error: "غير موجود" }); return; }
  await db.delete(correspondancesTable).where(eq(correspondancesTable.id, id));
  res.status(204).send();
});

export default router;
