import { Router } from "express";
import { db, casesTable, invoicesTable, eventsTable, tasksTable, clientsTable } from "@workspace/db";
import { eq, and, gte, lte, isNull, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 8) + "01";

  const [activeCasesRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(casesTable)
    .where(and(eq(casesTable.status, "active"), isNull(casesTable.deletedAt)));

  const [monthIncomeRow] = await db
    .select({ total: sql<string>`coalesce(sum(net_to_pay), 0)` })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.status, "paid"), gte(invoicesTable.createdAt, new Date(firstOfMonth))));

  const [pendingInvoicesRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoicesTable)
    .where(sql`status IN ('issued', 'partially_paid')`);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  const [upcomingRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventsTable)
    .where(and(gte(eventsTable.date, today), lte(eventsTable.date, nextWeekStr)));

  res.json({
    activeCases: activeCasesRow?.count ?? 0,
    monthlyIncome: Number(monthIncomeRow?.total ?? 0),
    pendingInvoices: pendingInvoicesRow?.count ?? 0,
    upcomingDeadlines: upcomingRow?.count ?? 0,
  });
});

router.get("/dashboard/today", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const sessions = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      caseId: eventsTable.caseId,
      caseName: casesTable.title,
      date: eventsTable.date,
      time: eventsTable.time,
      location: eventsTable.location,
      type: eventsTable.type,
      notes: eventsTable.notes,
      createdAt: eventsTable.createdAt,
    })
    .from(eventsTable)
    .leftJoin(casesTable, eq(eventsTable.caseId, casesTable.id))
    .where(eq(eventsTable.date, today));

  const tasks = await db
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
    .where(eq(tasksTable.done, false));

  res.json({ sessions, tasks });
});

router.get("/dashboard/alerts", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  const upcomingEvents = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      date: eventsTable.date,
      type: eventsTable.type,
      caseId: eventsTable.caseId,
      caseName: casesTable.title,
    })
    .from(eventsTable)
    .leftJoin(casesTable, eq(eventsTable.caseId, casesTable.id))
    .where(and(gte(eventsTable.date, today), lte(eventsTable.date, nextWeekStr)));

  const pendingInvoices = await db
    .select({
      id: invoicesTable.id,
      netToPay: invoicesTable.netToPay,
      dueDate: invoicesTable.dueDate,
      caseId: invoicesTable.caseId,
      caseName: casesTable.title,
    })
    .from(invoicesTable)
    .leftJoin(casesTable, eq(invoicesTable.caseId, casesTable.id))
    .where(sql`${invoicesTable.status} IN ('issued', 'partially_paid')`);

  const alerts = [
    ...upcomingEvents.map((e) => ({
      id: e.id,
      message: `جلسة قريبة: ${e.title}`,
      type: "hearing" as const,
      dueDate: e.date,
      caseId: e.caseId,
      caseName: e.caseName ?? null,
    })),
    ...pendingInvoices
      .filter((i) => i.dueDate)
      .map((i) => ({
        id: i.id + 10000,
        message: `فاتورة معلقة: ${Number(i.netToPay).toFixed(2)} دينار`,
        type: "payment" as const,
        dueDate: i.dueDate!,
        caseId: i.caseId,
        caseName: i.caseName ?? null,
      })),
  ];

  res.json(alerts);
});

export default router;
