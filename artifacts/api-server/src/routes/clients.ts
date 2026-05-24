import { Router } from "express";
import { db, clientsTable, clientContactsTable, clientEventsTable, casesTable, invoicesTable, documentsTable } from "@workspace/db";
import { eq, ilike, isNull, sql, like, and } from "drizzle-orm";
import { CreateClientBody, UpdateClientBody } from "@workspace/api-zod";
import { logger } from "../lib/logger.js";
import { getActor, requireAuth } from "../middleware/auth.js";
import { logAudit } from "./audit-logs.js";

const router = Router();

function extractExtras(body: Record<string, unknown>) {
  const str = (key: string) => typeof body[key] === "string" ? (body[key] as string) || null : null;
  return {
    clientType: str("clientType") ?? "individual",
    cin: str("cin"),
    taxId: str("taxId"),
    officeSeq: str("officeSeq"),
    legalForm: str("legalForm"),
    commercialRegister: str("commercialRegister"),
    rib: str("rib"),
    withholdingRate: str("withholdingRate"),
    withholdingExempt: typeof body["withholdingExempt"] === "boolean" ? body["withholdingExempt"] : undefined,
  };
}

// ── Client list ───────────────────────────────────────────────────────────────

router.get("/clients", async (req, res) => {
  const { search } = req.query as { search?: string };
  const page  = Math.max(0, parseInt((req.query.page  as string) ?? "0") || 0);
  const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) ?? "50") || 50));

  const actor = (req as typeof req & { user: { orgId?: number } }).user;
  const orgFilter = eq(clientsTable.orgId, actor.orgId ?? 0);
  const condition = search
    ? and(orgFilter, isNull(clientsTable.deletedAt), ilike(clientsTable.name, `%${search}%`))
    : and(orgFilter, isNull(clientsTable.deletedAt));

  const clients = await db.select().from(clientsTable)
    .where(condition)
    .orderBy(clientsTable.createdAt)
    .limit(limit)
    .offset(page * limit);

  res.json(clients);
});

router.post("/clients", async (req, res) => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const year = new Date().getFullYear();
  const yearPrefix = `${year}/`;
  const actor = getActor(req);
  const [count] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(clientsTable)
    .where(and(
      eq(clientsTable.orgId, actor.orgId ?? 0),
      like(clientsTable.officeSeq, `${yearPrefix}%`)
    ));
  const next = (count?.cnt ?? 0) + 1;
  const officeSeq = `${year}/${String(next).padStart(3, "0")}`;

  const extras = extractExtras(req.body as Record<string, unknown>);
  try {
    const [client] = await db.insert(clientsTable).values({
      ...parsed.data,
      ...extras,
      orgId: actor.orgId ?? 0,
      officeSeq: extras.officeSeq ?? officeSeq,
    }).returning();
    void logAudit({
      entityType: "client", entityId: client.id, action: "create",
      newValue: client.name,
      userId: actor.id, userName: actor.name,
    });
    res.status(201).json(client);
  } catch (err) {
    logger.error({ err }, "[POST /clients] insert failed");
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "فشل إضافة الموكّل. يرجى المحاولة مجدداً.", detail: msg });
  }
});

router.get("/clients/:id", async (req, res) => {
  const id = Number(req.params.id);
  const actor = (req as typeof req & { user?: { orgId?: number } }).user;
  const [client] = await db.select().from(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.orgId, actor?.orgId ?? 0)));
  if (!client) return res.status(404).json({ error: "Not found" });
  res.json(client);
});

router.put("/clients/:id", async (req, res) => {
  const id = Number(req.params.id);
  const actor = getActor(req);
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const extras = extractExtras(req.body as Record<string, unknown>);
  const [client] = await db.update(clientsTable).set({ ...parsed.data, ...extras })
    .where(and(eq(clientsTable.id, id), eq(clientsTable.orgId, actor?.orgId ?? 0))).returning();
  if (!client) return res.status(404).json({ error: "Not found" });
  void logAudit({
    entityType: "client", entityId: id, action: "update",
    newValue: client.name,
    userId: actor?.id, userName: actor?.name,
  });
  res.json(client);
});

router.get("/clients/:id/delete-check", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const activeCases = await db.select({ id: casesTable.id })
    .from(casesTable)
    .where(and(eq(casesTable.clientId, id), isNull(casesTable.deletedAt)));
  if (activeCases.length > 0) {
    res.json({ canDelete: false, reason: `لا يمكن الحذف: لدى الحريف ${activeCases.length} قضية نشطة. أرشف القضايا أولاً.` });
    return;
  }
  const unpaidInvoices = await db.select({ id: invoicesTable.id })
    .from(invoicesTable)
    .where(and(
      eq(invoicesTable.clientId, id),
      isNull(invoicesTable.deletedAt),
      sql`${invoicesTable.status} NOT IN ('paid', 'cancelled')`
    ));
  if (unpaidInvoices.length > 0) {
    res.json({ canDelete: false, reason: `لا يمكن الحذف: لدى الحريف ${unpaidInvoices.length} فاتورة غير مسددة. سدّد الفواتير أولاً.` });
    return;
  }
  res.json({ canDelete: true, reason: null });
});

router.patch("/clients/:id/soft-delete", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const actor = getActor(req);
  const [toDelete] = await db.select({ name: clientsTable.name })
    .from(clientsTable).where(and(eq(clientsTable.id, id), eq(clientsTable.orgId, actor?.orgId ?? 0)));
  await db.update(clientsTable).set({ deletedAt: new Date() })
    .where(and(eq(clientsTable.id, id), eq(clientsTable.orgId, actor?.orgId ?? 0)));
  void logAudit({
    entityType: "client", entityId: id, action: "delete",
    oldValue: toDelete?.name ?? String(id),
    userId: actor?.id, userName: actor?.name,
  });
  res.json({ deleted: true });
});

router.delete("/clients/:id", async (req, res) => {
  const id = Number(req.params.id);
  const actor = getActor(req);
  const [toDelete] = await db.select({ name: clientsTable.name })
    .from(clientsTable).where(and(eq(clientsTable.id, id), eq(clientsTable.orgId, actor?.orgId ?? 0)));
  await db.delete(clientsTable).where(and(eq(clientsTable.id, id), eq(clientsTable.orgId, actor?.orgId ?? 0)));
  void logAudit({
    entityType: "client", entityId: id, action: "delete_permanent",
    oldValue: toDelete?.name ?? String(id),
    userId: actor?.id, userName: actor?.name,
  });
  res.status(204).send();
});

// ── Contacts ──────────────────────────────────────────────────────────────────

router.get("/clients/:id/contacts", async (req, res) => {
  const clientId = Number(req.params.id);
  const contacts = await db.select().from(clientContactsTable)
    .where(eq(clientContactsTable.clientId, clientId));
  res.json(contacts);
});

router.post("/clients/:id/contacts", async (req, res): Promise<void> => {
  const clientId = Number(req.params.id);
  const { firstName, lastName, role, phone, email, isPrimary } = req.body as Record<string, string & boolean>;
  if (!firstName) { res.status(400).json({ error: "الاسم مطلوب" }); return; }
  if (isPrimary) {
    await db.update(clientContactsTable).set({ isPrimary: false })
      .where(eq(clientContactsTable.clientId, clientId));
  }
  const [contact] = await db.insert(clientContactsTable).values({
    clientId, firstName, lastName: lastName || "",
    role: role || null, phone: phone || null, email: email || null,
    isPrimary: !!isPrimary,
  }).returning();
  res.status(201).json(contact);
});

router.put("/clients/:id/contacts/:contactId", async (req, res): Promise<void> => {
  const clientId = Number(req.params.id);
  const contactId = Number(req.params.contactId);
  const { firstName, lastName, role, phone, email, isPrimary } = req.body as Record<string, string & boolean>;
  if (isPrimary) {
    await db.update(clientContactsTable).set({ isPrimary: false })
      .where(eq(clientContactsTable.clientId, clientId));
  }
  const [contact] = await db.update(clientContactsTable).set({
    firstName, lastName: lastName || "",
    role: role || null, phone: phone || null, email: email || null,
    isPrimary: !!isPrimary,
  }).where(eq(clientContactsTable.id, contactId)).returning();
  if (!contact) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json(contact);
});

router.delete("/clients/:id/contacts/:contactId", async (req, res) => {
  await db.delete(clientContactsTable).where(eq(clientContactsTable.id, Number(req.params.contactId)));
  res.status(204).send();
});

// ── Events / Journal ─────────────────────────────────────────────────────────

router.get("/clients/:id/events", async (req, res) => {
  const clientId = Number(req.params.id);
  const events = await db.select().from(clientEventsTable)
    .where(eq(clientEventsTable.clientId, clientId))
    .orderBy(clientEventsTable.occurredAt);
  res.json(events);
});

router.post("/clients/:id/events", async (req, res): Promise<void> => {
  const clientId = Number(req.params.id);
  const { eventType, payload, createdBy } = req.body as Record<string, unknown>;
  const validTypes = ["case_created", "invoice_issued", "payment_received", "document_signed", "message_sent", "note_added"];
  if (!eventType || !validTypes.includes(eventType as string)) {
    res.status(400).json({ error: "نوع الحدث غير صالح" }); return;
  }
  const [event] = await db.insert(clientEventsTable).values({
    clientId,
    eventType: eventType as "case_created" | "invoice_issued" | "payment_received" | "document_signed" | "message_sent" | "note_added",
    payload: payload as Record<string, unknown> ?? {},
    createdBy: String(createdBy ?? ""),
  }).returning();
  res.status(201).json(event);
});

// ── Related data ─────────────────────────────────────────────────────────────

router.get("/clients/:id/cases", async (req, res) => {
  const clientId = Number(req.params.id);
  const cases = await db.select().from(casesTable)
    .where(and(eq(casesTable.clientId, clientId), isNull(casesTable.deletedAt)))
    .orderBy(casesTable.createdAt);
  res.json(cases);
});

router.get("/clients/:id/invoices", async (req, res) => {
  const clientId = Number(req.params.id);
  const invoices = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.clientId, clientId), isNull(invoicesTable.deletedAt)))
    .orderBy(invoicesTable.createdAt);
  res.json(invoices);
});

router.get("/clients/:id/documents", async (req, res) => {
  const clientId = Number(req.params.id);
  const docs = await db
    .select({
      id: documentsTable.id,
      name: documentsTable.name,
      caseId: documentsTable.caseId,
      fileType: documentsTable.fileType,
      url: documentsTable.url,
      deletedAt: documentsTable.deletedAt,
      createdAt: documentsTable.createdAt,
    })
    .from(documentsTable)
    .innerJoin(casesTable, eq(documentsTable.caseId, casesTable.id))
    .where(and(eq(casesTable.clientId, clientId), isNull(documentsTable.deletedAt)))
    .orderBy(documentsTable.createdAt);
  res.json(docs);
});

export default router;
