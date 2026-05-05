import { Router } from "express";
import { db, casesTable, invoicesTable, clientsTable, tasksTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";

const router = Router();

const ARABIC_MONTHS: Record<string, string> = {
  "01": "جانفي", "02": "فيفري", "03": "مارس", "04": "أفريل",
  "05": "ماي", "06": "جوان", "07": "جويلية", "08": "أوت",
  "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
};

const STATUS_ARABIC: Record<string, string> = {
  active: "نشطة",
  pending: "انتظار",
  suspended: "موقوفة",
  closed: "مغلقة",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-500",
  pending: "bg-orange-500",
  suspended: "bg-yellow-500",
  closed: "bg-muted-foreground",
};

router.get("/reports/summary", async (req, res) => {
  const sevenMonthsAgo = new Date();
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 6);
  sevenMonthsAgo.setDate(1);
  sevenMonthsAgo.setHours(0, 0, 0, 0);

  const [monthlyRows, caseStatusRows, topClientsRows, billingRows, tasksRows] =
    await Promise.all([
      db.execute(
        sql`
          SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)::float AS income
          FROM invoices
          WHERE created_at >= ${sevenMonthsAgo}
          GROUP BY month
          ORDER BY month
        `
      ),

      db
        .select({ status: casesTable.status, count: sql<number>`count(*)::int` })
        .from(casesTable)
        .groupBy(casesTable.status),

      db.execute(
        sql`
          SELECT
            c.id,
            c.name,
            COUNT(DISTINCT cs.id)::int AS cases,
            COALESCE(SUM(i.amount), 0)::float AS amount
          FROM clients c
          LEFT JOIN cases cs ON cs.client_id = c.id
          LEFT JOIN invoices i ON i.client_id = c.id
          GROUP BY c.id, c.name
          ORDER BY amount DESC
          LIMIT 5
        `
      ),

      db.execute(
        sql`
          SELECT
            SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)::int AS paid_count,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)::float AS paid_amount,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)::int AS pending_count,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0)::float AS pending_amount
          FROM invoices
        `
      ),

      db
        .select({
          done: tasksTable.done,
          count: sql<number>`count(*)::int`,
        })
        .from(tasksTable)
        .groupBy(tasksTable.done),
    ]);

  // Build a full 7-month array filling gaps with 0
  const monthMap: Record<string, number> = {};
  for (const row of monthlyRows.rows as { month: string; income: number }[]) {
    monthMap[row.month] = Number(row.income);
  }

  const monthly = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly.push({
      month: ARABIC_MONTHS[key.slice(5)] ?? key.slice(5),
      income: monthMap[key] ?? 0,
    });
  }

  const totalCases = caseStatusRows.reduce((s, r) => s + r.count, 0) || 1;
  const caseStatus = caseStatusRows.map((r) => ({
    label: STATUS_ARABIC[r.status] ?? r.status,
    value: r.count,
    color: STATUS_COLOR[r.status] ?? "bg-muted-foreground",
    pct: Math.round((r.count / totalCases) * 100),
  }));

  const topClients = (topClientsRows.rows as { id: number; name: string; cases: number; amount: number }[]).map(
    (r) => ({ id: r.id, name: r.name, cases: r.cases, amount: Number(r.amount) })
  );

  const b = (billingRows.rows[0] ?? {}) as {
    paid_count: number; paid_amount: number;
    pending_count: number; pending_amount: number;
  };
  const billing = {
    paidCount: b.paid_count ?? 0,
    paidAmount: Number(b.paid_amount ?? 0),
    pendingCount: b.pending_count ?? 0,
    pendingAmount: Number(b.pending_amount ?? 0),
  };

  const tasksDone = tasksRows.find((r) => r.done === true)?.count ?? 0;
  const tasksPending = tasksRows.find((r) => r.done === false)?.count ?? 0;

  res.json({ monthly, caseStatus, topClients, billing, tasks: { done: tasksDone, pending: tasksPending } });
});

export default router;
