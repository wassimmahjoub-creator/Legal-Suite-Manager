import { Router } from "express";
import { db, casesTable, clientsTable, eventsTable, consultationsTable } from "@workspace/db";
import { ilike, or } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/search", requireAuth, async (req, res): Promise<void> => {
  const q = ((req.query as Record<string, string>).q ?? "").trim();
  if (q.length < 2) {
    res.json({ cases: [], clients: [], events: [], consultations: [] });
    return;
  }

  const pat = `%${q}%`;

  const [cases, clients, events, consultations] = await Promise.all([
    db.select({ id: casesTable.id, title: casesTable.title, status: casesTable.status, court: casesTable.court })
      .from(casesTable)
      .where(or(ilike(casesTable.title, pat), ilike(casesTable.court, pat), ilike(casesTable.lawyer, pat)))
      .limit(5),

    db.select({ id: clientsTable.id, name: clientsTable.name, phone: clientsTable.phone, email: clientsTable.email })
      .from(clientsTable)
      .where(or(ilike(clientsTable.name, pat), ilike(clientsTable.phone, pat), ilike(clientsTable.email, pat)))
      .limit(5),

    db.select({ id: eventsTable.id, title: eventsTable.title, date: eventsTable.date, caseId: eventsTable.caseId })
      .from(eventsTable)
      .where(ilike(eventsTable.title, pat))
      .limit(5),

    db.select({ id: consultationsTable.id, subject: consultationsTable.subject, date: consultationsTable.date })
      .from(consultationsTable)
      .where(ilike(consultationsTable.subject, pat))
      .limit(5),
  ]);

  res.json({ cases, clients, events, consultations });
});

export default router;
