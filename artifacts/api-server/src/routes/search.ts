import { Router } from "express";
import {
  db,
  casesTable,
  clientsTable,
  eventsTable,
  invoicesTable,
  documentsTable,
  courtsTable,
  opponentsTable,
} from "@workspace/db";
import { ilike, or, and, isNull, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/search", requireAuth, async (req, res): Promise<void> => {
  const q = ((req.query as Record<string, string>).q ?? "").trim();
  if (q.length < 2) {
    res.json({ results: [] });
    return;
  }

  const pat = `%${q}%`;

  const [cases, clients, invoices, documents, courts, opponents, events] = await Promise.all([
    db.select({ id: casesTable.id, title: casesTable.title, caseNumber: casesTable.caseNumber, court: casesTable.court })
      .from(casesTable)
      .where(and(
        isNull(casesTable.deletedAt),
        or(ilike(casesTable.title, pat), ilike(casesTable.caseNumber, pat))
      ))
      .limit(5),

    db.select({ id: clientsTable.id, name: clientsTable.name, phone: clientsTable.phone })
      .from(clientsTable)
      .where(or(ilike(clientsTable.name, pat), ilike(clientsTable.phone, pat)))
      .limit(5),

    db.select({ id: invoicesTable.id, invoiceNumber: invoicesTable.invoiceNumber, status: invoicesTable.status })
      .from(invoicesTable)
      .where(and(
        isNull(invoicesTable.deletedAt),
        ilike(invoicesTable.invoiceNumber, pat)
      ))
      .limit(5),

    db.select({ id: documentsTable.id, name: documentsTable.name })
      .from(documentsTable)
      .where(and(
        isNull(documentsTable.deletedAt),
        ilike(documentsTable.name, pat)
      ))
      .limit(5),

    db.select({ id: courtsTable.id, name: courtsTable.name, nameAr: courtsTable.nameAr, city: courtsTable.city })
      .from(courtsTable)
      .where(or(
        ilike(courtsTable.name, pat),
        ilike(courtsTable.nameAr, pat),
        ilike(courtsTable.nameFr, pat)
      ))
      .limit(5),

    db.select({ id: opponentsTable.id, name: opponentsTable.name, lawyerName: opponentsTable.lawyerName })
      .from(opponentsTable)
      .where(ilike(opponentsTable.name, pat))
      .limit(5),

    db.select({ id: eventsTable.id, title: eventsTable.title, date: eventsTable.date })
      .from(eventsTable)
      .where(and(
        ilike(eventsTable.title, pat),
        sql`${eventsTable.date} >= CURRENT_DATE - INTERVAL '90 days'`,
        sql`${eventsTable.date} <= CURRENT_DATE + INTERVAL '90 days'`
      ))
      .limit(5),
  ]);

  const results = [
    ...cases.map(c => ({
      type: "case" as const,
      id: String(c.id),
      title: c.title,
      subtitle: c.caseNumber ?? c.court ?? undefined,
      href: `/cases/${c.id}`,
    })),
    ...clients.map(c => ({
      type: "client" as const,
      id: String(c.id),
      title: c.name,
      subtitle: c.phone ?? undefined,
      href: `/clients`,
    })),
    ...invoices.map(i => ({
      type: "invoice" as const,
      id: String(i.id),
      title: i.invoiceNumber ?? `فاتورة #${i.id}`,
      subtitle: i.status ?? undefined,
      href: `/billing`,
    })),
    ...documents.map(d => ({
      type: "document" as const,
      id: String(d.id),
      title: d.name,
      href: `/documents`,
    })),
    ...courts.map(c => ({
      type: "court" as const,
      id: String(c.id),
      title: c.nameAr ?? c.name,
      subtitle: c.city ?? undefined,
      href: `/courts`,
    })),
    ...opponents.map(o => ({
      type: "opponent" as const,
      id: String(o.id),
      title: o.name,
      subtitle: o.lawyerName ?? undefined,
      href: `/opponents`,
    })),
    ...events.map(e => ({
      type: "event" as const,
      id: String(e.id),
      title: e.title,
      subtitle: e.date ? (() => {
        const d = new Date(String(e.date));
        const M = ["جانفي","فيفري","مارس","أفريل","ماي","جوان","جويلية","أوت","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
        return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
      })() : undefined,
      href: `/calendar`,
    })),
  ];

  res.json({ results });
});

export default router;
