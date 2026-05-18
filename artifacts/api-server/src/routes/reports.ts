import { Router } from "express";
import { db, casesTable, clientsTable, tasksTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const ARABIC_MONTHS: Record<string, string> = {
  "01": "جانفي", "02": "فيفري", "03": "مارس", "04": "أفريل",
  "05": "ماي", "06": "جوان", "07": "جويلية", "08": "أوت",
  "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
};

const STATUS_ARABIC: Record<string, string> = {
  active: "نشطة", pending: "انتظار", suspended: "موقوفة", closed: "مغلقة",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-500", pending: "bg-orange-500",
  suspended: "bg-yellow-500", closed: "bg-muted-foreground",
};

/* ── Existing summary endpoint ─────────────────────────────── */

router.get("/reports/summary", async (req, res) => {
  const sevenMonthsAgo = new Date();
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 6);
  sevenMonthsAgo.setDate(1);
  sevenMonthsAgo.setHours(0, 0, 0, 0);

  const [monthlyRows, caseStatusRows, topClientsRows, billingRows, tasksRows] =
    await Promise.all([
      db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN net_to_pay ELSE 0 END), 0)::float AS income
        FROM invoices
        WHERE created_at >= ${sevenMonthsAgo}
        GROUP BY month
        ORDER BY month
      `),
      db.select({ status: casesTable.status, count: sql<number>`count(*)::int` })
        .from(casesTable).groupBy(casesTable.status),
      db.execute(sql`
        SELECT c.id, c.name,
          COUNT(DISTINCT cs.id)::int AS cases,
          COALESCE(SUM(i.net_to_pay), 0)::float AS amount
        FROM clients c
        LEFT JOIN cases cs ON cs.client_id = c.id
        LEFT JOIN invoices i ON i.client_id = c.id
        GROUP BY c.id, c.name ORDER BY amount DESC LIMIT 5
      `),
      db.execute(sql`
        SELECT
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)::int AS paid_count,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN net_to_pay ELSE 0 END), 0)::float AS paid_amount,
          SUM(CASE WHEN status IN ('issued', 'partially_paid') THEN 1 ELSE 0 END)::int AS pending_count,
          COALESCE(SUM(CASE WHEN status IN ('issued', 'partially_paid') THEN net_to_pay ELSE 0 END), 0)::float AS pending_amount
        FROM invoices
      `),
      db.execute(sql`SELECT done, count(*)::int AS count FROM tasks GROUP BY done`),
    ]);

  const monthMap: Record<string, number> = {};
  for (const row of monthlyRows.rows as { month: string; income: number }[]) {
    monthMap[row.month] = Number(row.income);
  }
  const monthly = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly.push({ month: ARABIC_MONTHS[key.slice(5)] ?? key.slice(5), income: monthMap[key] ?? 0 });
  }
  const totalCases = caseStatusRows.reduce((s, r) => s + r.count, 0) || 1;
  const caseStatus = caseStatusRows.map((r) => ({
    label: STATUS_ARABIC[r.status] ?? r.status, value: r.count,
    color: STATUS_COLOR[r.status] ?? "bg-muted-foreground",
    pct: Math.round((r.count / totalCases) * 100),
  }));
  const topClients = (topClientsRows.rows as { id: number; name: string; cases: number; amount: number }[])
    .map((r) => ({ id: r.id, name: r.name, cases: r.cases, amount: Number(r.amount) }));
  const b = (billingRows.rows[0] ?? {}) as { paid_count: number; paid_amount: number; pending_count: number; pending_amount: number };
  const billing = { paidCount: b.paid_count ?? 0, paidAmount: Number(b.paid_amount ?? 0), pendingCount: b.pending_count ?? 0, pendingAmount: Number(b.pending_amount ?? 0) };
  const taskRows = tasksRows.rows as { done: boolean; count: number }[];
  const tasksDone    = taskRows.find((r) => r.done === true)?.count  ?? 0;
  const tasksPending = taskRows.find((r) => r.done === false)?.count ?? 0;
  res.json({ monthly, caseStatus, topClients, billing, tasks: { done: tasksDone, pending: tasksPending } });
});

/* ── GET /reports/case-profitability ───────────────────────── */

router.get("/reports/case-profitability", async (req, res) => {
  const { dateFrom, dateTo, status, caseType } = req.query as Record<string, string>;

  const whereClauses: string[] = ["c.deleted_at IS NULL"];
  const params: unknown[] = [];

  if (dateFrom) { params.push(dateFrom); whereClauses.push(`c.created_at >= $${params.length}`); }
  if (dateTo)   { params.push(dateTo);   whereClauses.push(`c.created_at <= $${params.length}::date + interval '1 day'`); }
  if (status && status !== "all") { params.push(status); whereClauses.push(`c.status = $${params.length}`); }
  if (caseType) { params.push(caseType); whereClauses.push(`c.case_type = $${params.length}`); }

  const where = whereClauses.join(" AND ");

  const rows = await db.execute(sql.raw(`
    SELECT
      c.id AS case_id,
      COALESCE(c.case_number, '#' || c.id::text) AS case_number,
      c.title,
      COALESCE(cl.name, '—') AS client_name,
      c.status,
      COALESCE(c.case_type, '—') AS case_type,
      c.created_at,
      COALESCE(SUM(i.net_to_pay) FILTER (WHERE i.status NOT IN ('draft','cancelled') AND i.deleted_at IS NULL), 0)::float AS total_invoiced,
      COALESCE(SUM(i.amount_paid) FILTER (WHERE i.deleted_at IS NULL), 0)::float AS total_collected,
      COALESCE(SUM(e.amount), 0)::float AS total_expenses,
      (COALESCE(SUM(i.amount_paid) FILTER (WHERE i.deleted_at IS NULL), 0) - COALESCE(SUM(e.amount), 0))::float AS gross_margin
    FROM cases c
    LEFT JOIN clients cl ON cl.id = c.client_id
    LEFT JOIN invoices i ON i.case_id = c.id
    LEFT JOIN expenses e ON e.case_id = c.id
    WHERE ${where}
    GROUP BY c.id, c.case_number, c.title, cl.name, c.status, c.case_type, c.created_at
    ORDER BY gross_margin DESC
  `, params));

  const data = (rows.rows as Record<string, unknown>[]).map(r => ({
    caseId:         Number(r.case_id),
    caseNumber:     String(r.case_number ?? ""),
    title:          String(r.title ?? ""),
    clientName:     String(r.client_name ?? ""),
    status:         String(r.status ?? ""),
    caseType:       String(r.case_type ?? ""),
    createdAt:      r.created_at,
    totalInvoiced:  Number(r.total_invoiced),
    totalCollected: Number(r.total_collected),
    totalExpenses:  Number(r.total_expenses),
    grossMargin:    Number(r.gross_margin),
  }));

  res.json(data);
});

/* ── GET /reports/lawyer-performance ──────────────────────── */

router.get("/reports/lawyer-performance", async (req, res) => {
  const rows = await db.execute(sql`
    SELECT
      u.id,
      u.name,
      u.role,
      COUNT(DISTINCT CASE WHEN cs.status = 'active' THEN ct.case_id END)::int AS active_cases,
      COUNT(DISTINCT ct.case_id)::int AS total_cases,
      COALESCE(SUM(i.net_to_pay) FILTER (WHERE i.status NOT IN ('draft','cancelled') AND i.deleted_at IS NULL), 0)::float AS total_invoiced,
      COALESCE(SUM(i.amount_paid) FILTER (WHERE i.deleted_at IS NULL), 0)::float AS total_collected
    FROM users u
    LEFT JOIN case_teams ct ON ct.user_id = u.id
    LEFT JOIN cases cs ON cs.id = ct.case_id AND cs.deleted_at IS NULL
    LEFT JOIN invoices i ON i.case_id = ct.case_id AND i.deleted_at IS NULL
    GROUP BY u.id, u.name, u.role
    ORDER BY total_collected DESC
  `);

  const data = (rows.rows as Record<string, unknown>[]).map(r => ({
    userId:         Number(r.id),
    name:           String(r.name ?? ""),
    role:           String(r.role ?? ""),
    activeCases:    Number(r.active_cases),
    totalCases:     Number(r.total_cases),
    totalInvoiced:  Number(r.total_invoiced),
    totalCollected: Number(r.total_collected),
  }));

  res.json(data);
});

/* ── GET /reports/client-sources ───────────────────────────── */

router.get("/reports/client-sources", async (req, res) => {
  const rows = await db.execute(sql`
    SELECT
      COALESCE(cl.client_type, 'individual') AS client_type,
      COUNT(DISTINCT cl.id)::int AS client_count,
      COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL)::int AS case_count,
      COALESCE(SUM(i.net_to_pay) FILTER (WHERE i.status NOT IN ('draft','cancelled') AND i.deleted_at IS NULL), 0)::float AS total_invoiced,
      COALESCE(SUM(i.amount_paid) FILTER (WHERE i.deleted_at IS NULL), 0)::float AS total_collected
    FROM clients cl
    LEFT JOIN cases c ON c.client_id = cl.id
    LEFT JOIN invoices i ON i.client_id = cl.id AND i.deleted_at IS NULL
    WHERE cl.deleted_at IS NULL
    GROUP BY COALESCE(cl.client_type, 'individual')
    ORDER BY total_collected DESC
  `);

  const CLIENT_TYPE_LABELS: Record<string, string> = {
    individual: "أفراد",
    company: "شركات",
    association: "جمعيات",
    government: "هيئات حكومية",
    other: "أخرى",
  };

  const data = (rows.rows as Record<string, unknown>[]).map(r => ({
    clientType:     String(r.client_type),
    clientTypeLabel: CLIENT_TYPE_LABELS[String(r.client_type)] ?? String(r.client_type),
    clientCount:    Number(r.client_count),
    caseCount:      Number(r.case_count),
    totalInvoiced:  Number(r.total_invoiced),
    totalCollected: Number(r.total_collected),
    avgPerClient:   Number(r.client_count) > 0
      ? Number(r.total_collected) / Number(r.client_count) : 0,
    conversionRate: Number(r.client_count) > 0
      ? Math.round((Number(r.case_count) / Number(r.client_count)) * 100) : 0,
  }));

  res.json(data);
});

export default router;
