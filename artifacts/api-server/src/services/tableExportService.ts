import ExcelJS from "exceljs";
import { ZipArchive } from "archiver";
import {
  db, clientsTable, casesTable, invoicesTable, invoiceLinesTable,
  opponentsTable, deadlinesTable, proceduresTable, caseTeamsTable,
  documentsTable, usersTable, caseStagesTable, caseEventsTable,
  expensesTable, confidentialNotesTable,
} from "@workspace/db";
import { isNull, isNotNull, eq, and } from "drizzle-orm";

const GOLD_ARGB = "FFD4AF37";
const WHITE_ARGB = "FFFFFFFF";
const DARK_ARGB = "FF0D1B2A";

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

function fmtNum(v: string | number | null | undefined): number | string {
  if (v == null || v === "") return "";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? "" : n;
}

function escapeCsv(v: string | number | null | undefined): string {
  if (v == null) return '""';
  const s = String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): Buffer {
  const BOM = "\uFEFF";
  const lines = [
    headers.map(escapeCsv).join(";"),
    ...rows.map(r => r.map(escapeCsv).join(";")),
  ];
  return Buffer.from(BOM + lines.join("\r\n"), "utf8");
}

function applyGoldHeader(ws: ExcelJS.Worksheet, colCount: number): void {
  const row = ws.getRow(1);
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: WHITE_ARGB }, name: "Cairo", size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD_ARGB } };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF8B6914" } } };
  }
  row.height = 22;
}

function autoWidths(ws: ExcelJS.Worksheet, headers: string[], data: (string | number | null | undefined)[][]): void {
  headers.forEach((h, i) => {
    const maxData = data.reduce((max, row) => {
      const len = String(row[i] ?? "").length;
      return len > max ? len : max;
    }, 0);
    ws.getColumn(i + 1).width = Math.min(Math.max(h.length * 1.4, maxData, 10), 50);
  });
}

function setRtlView(ws: ExcelJS.Worksheet): void {
  ws.views = [{ rightToLeft: true, state: "normal" }];
}

function styleDataRows(ws: ExcelJS.Worksheet, rowCount: number, colCount: number): void {
  for (let r = 2; r <= rowCount + 1; r++) {
    const row = ws.getRow(r);
    row.height = 18;
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.alignment = { vertical: "middle", readingOrder: "rtl" };
      if (r % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F0E8" } };
      }
    }
  }
}

/* ────────────────────────────────────────────────────────────────────── */
/* CLIENTS EXPORT                                                          */
/* ────────────────────────────────────────────────────────────────────── */

export interface ClientExportFilters {
  search?: string;
}

async function fetchClients(f: ClientExportFilters) {
  let rows = await db
    .select()
    .from(clientsTable)
    .where(isNull(clientsTable.deletedAt))
    .orderBy(clientsTable.createdAt);

  if (f.search) {
    const q = f.search.toLowerCase();
    rows = rows.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  }

  return rows;
}

const CLIENT_HEADERS = [
  "الاسم", "النوع", "المعرّف الجبائي", "السجل التجاري",
  "الشكل القانوني", "رقم بطاقة التعريف", "RIB",
  "نسبة الخصم (%)", "الهاتف", "البريد الإلكتروني",
  "العنوان", "تاريخ الإنشاء",
];

function clientToRow(c: typeof clientsTable.$inferSelect): (string | number | null)[] {
  return [
    c.name,
    c.clientType === "company" ? "شخص معنوي" : "شخص طبيعي",
    c.taxId ?? "",
    c.commercialRegister ?? "",
    c.legalForm ?? "",
    c.cin ?? "",
    c.rib ?? "",
    fmtNum(c.withholdingRate),
    c.phone ?? "",
    c.email ?? "",
    c.address ?? "",
    fmtDate(c.createdAt),
  ];
}

export async function exportClientsXlsx(filters: ClientExportFilters): Promise<Buffer> {
  const rows = await fetchClients(filters);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mahami Plus";
  wb.created = new Date();

  const ws = wb.addWorksheet("الموكّلون");
  setRtlView(ws);
  ws.addRow(CLIENT_HEADERS);
  applyGoldHeader(ws, CLIENT_HEADERS.length);

  const data = rows.map(clientToRow);
  data.forEach(row => ws.addRow(row));

  ws.getColumn(8).numFmt = '# ##0.00"%"';
  styleDataRows(ws, data.length, CLIENT_HEADERS.length);
  autoWidths(ws, CLIENT_HEADERS, data);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: CLIENT_HEADERS.length } };

  return wb.xlsx.writeBuffer() as Promise<Buffer>;
}

export async function exportClientsCsv(filters: ClientExportFilters): Promise<Buffer> {
  const rows = await fetchClients(filters);
  return buildCsv(CLIENT_HEADERS, rows.map(clientToRow));
}

/* ────────────────────────────────────────────────────────────────────── */
/* CASES EXPORT                                                            */
/* ────────────────────────────────────────────────────────────────────── */

export interface CasesExportFilters {
  search?: string;
  status?: string;
  archived?: boolean;
}

async function fetchCases(f: CasesExportFilters) {
  const conditions = [isNull(casesTable.deletedAt)];
  if (f.archived) {
    conditions.push(isNotNull(casesTable.archivedAt));
  } else {
    conditions.push(isNull(casesTable.archivedAt));
  }

  const rows = await db
    .select({
      id: casesTable.id,
      caseNumber: casesTable.caseNumber,
      courtCaseNumber: casesTable.courtCaseNumber,
      title: casesTable.title,
      clientId: casesTable.clientId,
      clientName: clientsTable.name,
      status: casesTable.status,
      court: casesTable.court,
      division: casesTable.division,
      lawyer: casesTable.lawyer,
      nextHearing: casesTable.nextHearing,
      firstHearingDate: casesTable.firstHearingDate,
      openedAt: casesTable.openedAt,
      procedureStage: casesTable.procedureStage,
      caseType: casesTable.caseType,
      litigationDegree: casesTable.litigationDegree,
      procedureType: casesTable.procedureType,
      feeMethod: casesTable.feeMethod,
      agreedFees: casesTable.agreedFees,
      disputeValue: casesTable.disputeValue,
      opponentName: casesTable.opponentName,
      opponentLawyer: casesTable.opponentLawyer,
      judgeName: casesTable.judgeName,
      casePriority: casesTable.casePriority,
      archivedAt: casesTable.archivedAt,
      createdAt: casesTable.createdAt,
    })
    .from(casesTable)
    .leftJoin(clientsTable, eq(casesTable.clientId, clientsTable.id))
    .where(and(...conditions))
    .orderBy(casesTable.createdAt);

  let filtered = rows;
  if (f.status && f.status !== "all") {
    filtered = filtered.filter(r => r.status === f.status);
  }
  if (f.search) {
    const q = f.search.toLowerCase();
    filtered = filtered.filter(r =>
      r.title.toLowerCase().includes(q) ||
      (r.clientName ?? "").toLowerCase().includes(q) ||
      (r.caseNumber ?? "").includes(q) ||
      (r.courtCaseNumber ?? "").includes(q)
    );
  }
  return filtered;
}

const STATUS_LABELS: Record<string, string> = {
  active: "نشطة", pending: "في الانتظار", suspended: "موقوفة",
  closed: "مغلقة", archived: "مؤرشفة",
};

const CASE_HEADERS = [
  "رقم الملف", "عدد القضية بالمحكمة", "عنوان القضية",
  "الموكّل", "الحالة", "المرحلة الإجرائية", "درجة التقاضي",
  "المحكمة", "الدائرة", "القاضي", "محامي المكتب",
  "الخصم الرئيسي", "محامي الخصم",
  "أول جلسة", "الجلسة القادمة", "تاريخ فتح الملف",
  "طريقة الأتعاب", "قيمة النزاع (د.ت)", "الأتعاب المتفق عليها (د.ت)",
];

type CaseRow = Awaited<ReturnType<typeof fetchCases>>[number];

function caseToRow(c: CaseRow): (string | number | null)[] {
  return [
    c.caseNumber ?? "",
    c.courtCaseNumber ?? "",
    c.title,
    c.clientName ?? "",
    STATUS_LABELS[c.status] ?? c.status,
    c.procedureStage ?? "",
    c.litigationDegree ?? "",
    c.court ?? "",
    c.division ?? "",
    c.judgeName ?? "",
    c.lawyer ?? "",
    c.opponentName ?? "",
    c.opponentLawyer ?? "",
    fmtDate(c.firstHearingDate),
    fmtDate(c.nextHearing),
    fmtDate(c.openedAt ?? c.createdAt),
    c.feeMethod ?? "",
    fmtNum(c.disputeValue),
    fmtNum(c.agreedFees),
  ];
}

export async function exportCasesXlsx(filters: CasesExportFilters): Promise<Buffer> {
  const rows = await fetchCases(filters);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mahami Plus";
  wb.created = new Date();

  const ws = wb.addWorksheet("القضايا");
  setRtlView(ws);
  ws.addRow(CASE_HEADERS);
  applyGoldHeader(ws, CASE_HEADERS.length);

  const data = rows.map(caseToRow);
  data.forEach(row => ws.addRow(row));
  ws.getColumn(18).numFmt = '#,##0.000 "د.ت"';
  ws.getColumn(19).numFmt = '#,##0.000 "د.ت"';
  styleDataRows(ws, data.length, CASE_HEADERS.length);
  autoWidths(ws, CASE_HEADERS, data);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: CASE_HEADERS.length } };

  return wb.xlsx.writeBuffer() as Promise<Buffer>;
}

export async function exportCasesCsv(filters: CasesExportFilters): Promise<Buffer> {
  const rows = await fetchCases(filters);
  return buildCsv(CASE_HEADERS, rows.map(caseToRow));
}

/* ────────────────────────────────────────────────────────────────────── */
/* INVOICES EXPORT                                                         */
/* ────────────────────────────────────────────────────────────────────── */

export interface InvoicesExportFilters {
  search?: string;
  status?: string;
}

async function fetchInvoices(f: InvoicesExportFilters) {
  const rows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      clientId: invoicesTable.clientId,
      clientName: clientsTable.name,
      clientTaxId: clientsTable.taxId,
      caseId: invoicesTable.caseId,
      caseName: casesTable.title,
      issueDate: invoicesTable.issueDate,
      dueDate: invoicesTable.dueDate,
      status: invoicesTable.status,
      subtotalHt: invoicesTable.subtotalHt,
      vatTotal: invoicesTable.vatTotal,
      stampDuty: invoicesTable.stampDuty,
      withholdingTax: invoicesTable.withholdingTax,
      totalTtc: invoicesTable.totalTtc,
      netToPay: invoicesTable.netToPay,
      amountPaid: invoicesTable.amountPaid,
      balanceDue: invoicesTable.balanceDue,
      paymentTerms: invoicesTable.paymentTerms,
      deletedAt: invoicesTable.deletedAt,
    })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(casesTable, eq(invoicesTable.caseId, casesTable.id))
    .where(isNull(invoicesTable.deletedAt))
    .orderBy(invoicesTable.createdAt);

  let filtered = rows;
  if (f.status) filtered = filtered.filter(r => r.status === f.status);
  if (f.search) {
    const q = f.search.toLowerCase();
    filtered = filtered.filter(r =>
      (r.clientName ?? "").toLowerCase().includes(q) ||
      (r.invoiceNumber ?? "").toLowerCase().includes(q) ||
      (r.caseName ?? "").toLowerCase().includes(q)
    );
  }
  return filtered;
}

const INV_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة", issued: "صادرة", paid: "مدفوعة",
  partial: "مدفوعة جزئياً", overdue: "متأخرة", cancelled: "ملغاة",
};

const INV_HEADERS = [
  "رقم الفاتورة", "تاريخ الإصدار", "تاريخ الاستحقاق",
  "الموكّل", "المعرّف الجبائي", "الملف المرتبط",
  "المبلغ HT (د.ت)", "TVA (د.ت)", "الطابع الجبائي (د.ت)",
  "الخصم بالمصدر (د.ت)", "المبلغ TTC (د.ت)",
  "صافي للدفع (د.ت)", "المدفوع (د.ت)", "الرصيد (د.ت)",
  "الحالة", "شروط الدفع",
];

type InvRow = Awaited<ReturnType<typeof fetchInvoices>>[number];

function invToRow(i: InvRow): (string | number | null)[] {
  return [
    i.invoiceNumber ?? `#${String(i.id).padStart(4, "0")}`,
    fmtDate(i.issueDate),
    fmtDate(i.dueDate),
    i.clientName ?? "",
    i.clientTaxId ?? "",
    i.caseName ?? "",
    fmtNum(i.subtotalHt),
    fmtNum(i.vatTotal),
    fmtNum(i.stampDuty),
    fmtNum(i.withholdingTax),
    fmtNum(i.totalTtc),
    fmtNum(i.netToPay),
    fmtNum(i.amountPaid),
    fmtNum(i.balanceDue),
    INV_STATUS_LABELS[i.status] ?? i.status,
    i.paymentTerms ?? "",
  ];
}

const LINE_HEADERS = [
  "رقم الفاتورة", "رقم السطر", "الوصف", "الوحدة",
  "الكمية", "السعر الوحدوي HT (د.ت)", "TVA (%)",
  "إجمالي HT (د.ت)", "TVA للسطر (د.ت)",
];

export async function exportInvoicesXlsx(filters: InvoicesExportFilters): Promise<Buffer> {
  const invRows = await fetchInvoices(filters);
  const invIds = invRows.map(r => r.id);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Mahami Plus";
  wb.created = new Date();

  const ws1 = wb.addWorksheet("الفواتير");
  setRtlView(ws1);
  ws1.addRow(INV_HEADERS);
  applyGoldHeader(ws1, INV_HEADERS.length);
  const data1 = invRows.map(invToRow);
  data1.forEach(row => ws1.addRow(row));
  const moneyFmt = '#,##0.000 "د.ت"';
  [7, 8, 9, 10, 11, 12, 13, 14].forEach(c => { ws1.getColumn(c).numFmt = moneyFmt; });
  styleDataRows(ws1, data1.length, INV_HEADERS.length);
  autoWidths(ws1, INV_HEADERS, data1);
  ws1.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: INV_HEADERS.length } };

  if (invIds.length > 0) {
    const allLines = await db
      .select()
      .from(invoiceLinesTable)
      .where(
        invIds.length === 1
          ? eq(invoiceLinesTable.invoiceId, invIds[0])
          : undefined
      )
      .orderBy(invoiceLinesTable.invoiceId, invoiceLinesTable.position);

    const filteredLines = invIds.length > 1
      ? allLines.filter(l => invIds.includes(l.invoiceId))
      : allLines;

    if (filteredLines.length > 0) {
      const ws2 = wb.addWorksheet("تفاصيل الأسطر");
      setRtlView(ws2);
      ws2.addRow(LINE_HEADERS);
      applyGoldHeader(ws2, LINE_HEADERS.length);

      const lineData = filteredLines.map(l => {
        const inv = invRows.find(i => i.id === l.invoiceId);
        return [
          inv?.invoiceNumber ?? `#${String(l.invoiceId).padStart(4, "0")}`,
          l.position + 1,
          l.description,
          l.unit ?? "forfait",
          fmtNum(l.quantity),
          fmtNum(l.unitPriceHt),
          fmtNum(l.vatRate),
          fmtNum(l.lineTotalHt),
          fmtNum(l.lineVat),
        ] as (string | number | null)[];
      });
      lineData.forEach(row => ws2.addRow(row));
      [5, 6, 8, 9].forEach(c => { ws2.getColumn(c).numFmt = moneyFmt; });
      ws2.getColumn(7).numFmt = '0.00"%"';
      styleDataRows(ws2, lineData.length, LINE_HEADERS.length);
      autoWidths(ws2, LINE_HEADERS, lineData);
    }
  }

  return wb.xlsx.writeBuffer() as Promise<Buffer>;
}

export async function exportInvoicesCsv(filters: InvoicesExportFilters): Promise<Buffer> {
  const rows = await fetchInvoices(filters);
  return buildCsv(INV_HEADERS, rows.map(invToRow));
}

/* ────────────────────────────────────────────────────────────────────── */
/* SINGLE CASE DETAIL EXPORT                                               */
/* ────────────────────────────────────────────────────────────────────── */

function addKeyValueSheet(wb: ExcelJS.Workbook, name: string, pairs: [string, string | number | null][]): void {
  const ws = wb.addWorksheet(name);
  ws.views = [{ rightToLeft: true, state: "normal" }];
  ws.columns = [{ width: 28 }, { width: 40 }];
  pairs.forEach(([key, val], i) => {
    const row = ws.addRow([key, val ?? ""]);
    row.getCell(1).font = { bold: true, name: "Cairo", size: 10, color: { argb: DARK_ARGB } };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? "FFF5F0E8" : WHITE_ARGB } };
    row.getCell(2).alignment = { readingOrder: "rtl" };
    row.height = 18;
  });
}

function addTableSheet(
  wb: ExcelJS.Workbook,
  name: string,
  headers: string[],
  data: (string | number | null)[][],
): void {
  const ws = wb.addWorksheet(name);
  setRtlView(ws);
  ws.addRow(headers);
  applyGoldHeader(ws, headers.length);
  data.forEach(r => ws.addRow(r));
  styleDataRows(ws, data.length, headers.length);
  autoWidths(ws, headers, data);
  if (data.length > 0) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  }
}

export async function exportCaseDetailXlsx(caseId: number): Promise<Buffer> {
  const [caseRow] = await db
    .select()
    .from(casesTable)
    .where(eq(casesTable.id, caseId))
    .limit(1);
  if (!caseRow) throw new Error("case not found");

  let clientName = "";
  if (caseRow.clientId) {
    const [cl] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, caseRow.clientId)).limit(1);
    clientName = cl?.name ?? "";
  }

  const [opponents, deadlines, procedures, teams, invoices, documents] = await Promise.all([
    db.select().from(opponentsTable).where(eq(opponentsTable.caseId, caseId)),
    db.select().from(deadlinesTable).where(eq(deadlinesTable.caseId, caseId)).orderBy(deadlinesTable.dueDate),
    db.select().from(proceduresTable).where(eq(proceduresTable.caseId, caseId)).orderBy(proceduresTable.startedAt),
    db.select().from(caseTeamsTable).where(eq(caseTeamsTable.caseId, caseId)),
    db.select({
      id: invoicesTable.id, invoiceNumber: invoicesTable.invoiceNumber,
      issueDate: invoicesTable.issueDate, dueDate: invoicesTable.dueDate,
      status: invoicesTable.status, netToPay: invoicesTable.netToPay,
      amountPaid: invoicesTable.amountPaid, balanceDue: invoicesTable.balanceDue,
    }).from(invoicesTable).where(and(eq(invoicesTable.caseId, caseId), isNull(invoicesTable.deletedAt))),
    db.select().from(documentsTable).where(and(eq(documentsTable.caseId, caseId), isNull(documentsTable.deletedAt))),
  ]);

  const STAGE_LABELS: Record<string, string> = {
    ibtidai: "ابتدائي", istiinaf: "استئناف", taaqqub: "تعقيب",
    tanfidh: "تنفيذ", khatm: "ختم",
  };

  const wb = new ExcelJS.Workbook();
  wb.creator = "Mahami Plus";
  wb.created = new Date();

  /* Sheet 1 — Case info */
  addKeyValueSheet(wb, "معلومات الملف", [
    ["رقم الملف", caseRow.caseNumber ?? ""],
    ["عدد القضية بالمحكمة", caseRow.courtCaseNumber ?? ""],
    ["عنوان القضية", caseRow.title],
    ["الموكّل", clientName],
    ["المحكمة", caseRow.court ?? ""],
    ["الدائرة", caseRow.division ?? ""],
    ["القاضي", caseRow.judgeName ?? ""],
    ["محامي المكتب", caseRow.lawyer ?? ""],
    ["نوع القضية", caseRow.caseType ?? ""],
    ["درجة التقاضي", caseRow.litigationDegree ?? ""],
    ["نوع الإجراء", caseRow.procedureType ?? ""],
    ["المرحلة الإجرائية", STAGE_LABELS[caseRow.procedureStage ?? ""] ?? (caseRow.procedureStage ?? "")],
    ["الحالة", STATUS_LABELS[caseRow.status] ?? caseRow.status],
    ["الأولوية", caseRow.casePriority ?? ""],
    ["الخصم الرئيسي", caseRow.opponentName ?? ""],
    ["محامي الخصم", caseRow.opponentLawyer ?? ""],
    ["طريقة الأتعاب", caseRow.feeMethod ?? ""],
    ["قيمة النزاع (د.ت)", fmtNum(caseRow.disputeValue)],
    ["الأتعاب المتفق عليها (د.ت)", fmtNum(caseRow.agreedFees)],
    ["أول جلسة", fmtDate(caseRow.firstHearingDate)],
    ["الجلسة القادمة", fmtDate(caseRow.nextHearing)],
    ["تاريخ فتح الملف", fmtDate(caseRow.openedAt ?? caseRow.createdAt)],
    ["ملاحظات", caseRow.notes ?? ""],
  ]);

  /* Sheet 2 — Opponents */
  addTableSheet(wb, "الخصوم", ["الاسم", "الصفة", "الهاتف", "البريد الإلكتروني", "العنوان", "محامي الخصم"],
    opponents.map(o => [o.name, o.role ?? "", o.phone ?? "", o.email ?? "", o.address ?? "", o.opponentLawyer ?? ""]));

  /* Sheet 3 — Deadlines */
  addTableSheet(wb, "الآجال",
    ["النوع", "التاريخ الأصلي", "تاريخ الاستحقاق", "الحالة", "الإلحاحية", "ملاحظات"],
    deadlines.map(d => [
      d.deadlineType ?? "", fmtDate(d.originalDate), fmtDate(d.dueDate),
      d.status ?? "", d.urgency ?? "", d.notes ?? "",
    ]));

  /* Sheet 4 — Procedures */
  addTableSheet(wb, "الإجراءات",
    ["المرحلة", "تاريخ البداية", "تاريخ الإنهاء", "الحالة", "ملاحظات"],
    procedures.map(p => [
      p.stage ?? "", fmtDate(p.startedAt), fmtDate(p.endedAt),
      p.status ?? "", p.notes ?? "",
    ]));

  /* Sheet 5 — Invoices */
  addTableSheet(wb, "الفواتير",
    ["رقم الفاتورة", "تاريخ الإصدار", "الاستحقاق", "الحالة", "صافي للدفع", "المدفوع", "الرصيد"],
    invoices.map(i => [
      i.invoiceNumber ?? `#${String(i.id).padStart(4, "0")}`,
      fmtDate(i.issueDate), fmtDate(i.dueDate),
      INV_STATUS_LABELS[i.status] ?? i.status,
      fmtNum(i.netToPay), fmtNum(i.amountPaid), fmtNum(i.balanceDue),
    ]));

  /* Sheet 6 — Team */
  addTableSheet(wb, "فريق الملف",
    ["المستخدم", "الدور"],
    teams.map(t => [t.userId ?? "", t.role ?? ""]));

  /* Sheet 7 — Documents */
  addTableSheet(wb, "الوثائق",
    ["العنوان", "النوع", "تاريخ الرفع"],
    documents.map(d => [d.title, d.fileType ?? "", fmtDate(d.createdAt)]));

  return wb.xlsx.writeBuffer() as Promise<Buffer>;
}

export async function exportCaseDetailCsv(caseId: number): Promise<Buffer> {
  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!caseRow) throw new Error("case not found");

  let clientName = "";
  if (caseRow.clientId) {
    const [cl] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, caseRow.clientId)).limit(1);
    clientName = cl?.name ?? "";
  }

  const headers = ["الحقل", "القيمة"];
  const rows: (string | number | null)[][] = [
    ["رقم الملف", caseRow.caseNumber ?? ""],
    ["عدد القضية بالمحكمة", caseRow.courtCaseNumber ?? ""],
    ["عنوان القضية", caseRow.title],
    ["الموكّل", clientName],
    ["المحكمة", caseRow.court ?? ""],
    ["الدائرة", caseRow.division ?? ""],
    ["القاضي", caseRow.judgeName ?? ""],
    ["محامي المكتب", caseRow.lawyer ?? ""],
    ["الحالة", STATUS_LABELS[caseRow.status] ?? caseRow.status],
    ["الخصم الرئيسي", caseRow.opponentName ?? ""],
    ["محامي الخصم", caseRow.opponentLawyer ?? ""],
    ["قيمة النزاع (د.ت)", fmtNum(caseRow.disputeValue)],
    ["الأتعاب المتفق عليها (د.ت)", fmtNum(caseRow.agreedFees)],
    ["أول جلسة", fmtDate(caseRow.firstHearingDate)],
    ["الجلسة القادمة", fmtDate(caseRow.nextHearing)],
    ["تاريخ فتح الملف", fmtDate(caseRow.openedAt ?? caseRow.createdAt)],
    ["ملاحظات", caseRow.notes ?? ""],
  ];
  return buildCsv(headers, rows);
}

/* ────────────────────────────────────────────────────────────────────── */
/* CASE ZIP EXPORT                                                         */
/* ────────────────────────────────────────────────────────────────────── */

export interface CaseZipOptions {
  includeInternal?: boolean;
}

function jsonBuf(obj: unknown): Buffer {
  return Buffer.from(JSON.stringify(obj, null, 2), "utf8");
}

function pad2(n: number) { return String(n).padStart(2, "0"); }
function isoDate(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

export async function generateCaseZip(caseId: number, opts: CaseZipOptions = {}): Promise<Buffer> {
  const { includeInternal = false } = opts;

  /* ─ Fetch all data ─ */
  const [caseRow] = await db
    .select()
    .from(casesTable)
    .where(eq(casesTable.id, caseId))
    .limit(1);
  if (!caseRow) throw new Error("case not found");

  let clientName = "";
  if (caseRow.clientId) {
    const [cl] = await db.select({ name: clientsTable.name }).from(clientsTable)
      .where(eq(clientsTable.id, caseRow.clientId)).limit(1);
    clientName = cl?.name ?? "";
  }

  const [
    opponents, deadlines, procedures, teams, invoices,
    documents, stages, events, expenses, confNotes,
  ] = await Promise.all([
    db.select().from(opponentsTable).where(eq(opponentsTable.caseId, caseId)),
    db.select().from(deadlinesTable).where(eq(deadlinesTable.caseId, caseId)).orderBy(deadlinesTable.dueDate),
    db.select().from(proceduresTable).where(eq(proceduresTable.caseId, caseId)).orderBy(proceduresTable.startedAt),
    db.select().from(caseTeamsTable).where(eq(caseTeamsTable.caseId, caseId)),
    db.select().from(invoicesTable).where(and(eq(invoicesTable.caseId, caseId), isNull(invoicesTable.deletedAt))).orderBy(invoicesTable.issueDate),
    db.select().from(documentsTable).where(and(eq(documentsTable.caseId, caseId), isNull(documentsTable.deletedAt))).orderBy(documentsTable.createdAt),
    db.select().from(caseStagesTable).where(eq(caseStagesTable.caseId, caseId)).orderBy(caseStagesTable.enteredAt),
    db.select().from(caseEventsTable).where(eq(caseEventsTable.caseId, caseId)).orderBy(caseEventsTable.occurredAt),
    db.select().from(expensesTable).where(eq(expensesTable.caseId, caseId)).orderBy(expensesTable.date),
    includeInternal
      ? db.select().from(confidentialNotesTable).where(eq(confidentialNotesTable.caseId, caseId)).orderBy(confidentialNotesTable.createdAt)
      : Promise.resolve([]),
  ]);

  const today = isoDate(new Date());
  const caseLabel = (caseRow.caseNumber ?? `case-${caseId}`).replace(/\//g, "-");
  const dirName = `ملف-${caseLabel}`;

  /* ─ Financial summary ─ */
  const totalInvoiced = invoices.reduce((s, i) => s + parseFloat(String(i.totalTtc ?? 0)), 0);
  const totalPaid = invoices.reduce((s, i) => s + parseFloat(String(i.amountPaid ?? 0)), 0);
  const totalBalance = invoices.reduce((s, i) => s + parseFloat(String(i.balanceDue ?? 0)), 0);
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(String(e.amount ?? 0)), 0);

  /* ─ README ─ */
  const readme = [
    `ملف القضية: ${caseRow.caseNumber ?? "—"}`,
    `العنوان: ${caseRow.title}`,
    `الموكّل: ${clientName}`,
    `الحالة: ${STATUS_LABELS[caseRow.status] ?? caseRow.status}`,
    `المحكمة: ${caseRow.court ?? "—"} — الدائرة: ${caseRow.division ?? "—"}`,
    `الجلسة القادمة: ${caseRow.nextHearing ?? "—"}`,
    ``,
    `تاريخ التصدير: ${today}`,
    `تم الإنشاء بواسطة: محامي بلوس (Mahami Plus)`,
    ``,
    `محتويات الأرشيف:`,
    `  بيانات/القضية.json         — بيانات الملف الكاملة`,
    `  بيانات/الفواتير.json       — ${invoices.length} فاتورة`,
    `  بيانات/الآجال.json         — ${deadlines.length} أجل`,
    `  بيانات/الإجراءات.json      — ${procedures.length} إجراء`,
    `  بيانات/الطعون.json         — ${stages.length} مرحلة`,
    `  بيانات/فريق-الملف.json    — ${teams.length} عضو`,
    `  بيانات/الخصوم.json         — ${opponents.length} خصم`,
    `  بيانات/الوثائق.json        — قائمة بـ ${documents.length} وثيقة`,
    `  بيانات/المصاريف.json       — ${expenses.length} مصروف (${totalExpenses.toFixed(3)} د.ت)`,
    `  بيانات/الأحداث.json        — ${events.length} حدث`,
    ...(includeInternal ? [`  داخلي/الملاحظات-السرية.json — ${confNotes.length} ملاحظة [داخلي فقط]`] : []),
    ``,
    `ملخص مالي:`,
    `  مجموع الفواتير: ${totalInvoiced.toFixed(3)} د.ت`,
    `  المدفوع: ${totalPaid.toFixed(3)} د.ت`,
    `  الرصيد: ${totalBalance.toFixed(3)} د.ت`,
    `  الأتعاب المتفق عليها: ${parseFloat(String(caseRow.agreedFees ?? 0)).toFixed(3)} د.ت`,
  ].join("\n");

  /* ─ Build ZIP in memory ─ */
  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 6 } });
    const chunks: Buffer[] = [];

    archive.on("data", (c: Buffer) => chunks.push(c));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    const dir = `${dirName}/`;

    /* README */
    archive.append(Buffer.from(readme, "utf8"), { name: `${dir}README.txt` });

    /* Data files */
    archive.append(jsonBuf({ ...caseRow, clientName }), { name: `${dir}بيانات/القضية.json` });
    archive.append(jsonBuf(invoices), { name: `${dir}بيانات/الفواتير.json` });
    archive.append(jsonBuf(deadlines), { name: `${dir}بيانات/الآجال.json` });
    archive.append(jsonBuf(procedures), { name: `${dir}بيانات/الإجراءات.json` });
    archive.append(jsonBuf(stages), { name: `${dir}بيانات/الطعون.json` });
    archive.append(jsonBuf(teams), { name: `${dir}بيانات/فريق-الملف.json` });
    archive.append(jsonBuf(opponents), { name: `${dir}بيانات/الخصوم.json` });
    archive.append(jsonBuf(documents.map(d => ({
      id: d.id, title: d.title, fileType: d.fileType, createdAt: d.createdAt,
    }))), { name: `${dir}بيانات/الوثائق.json` });
    archive.append(jsonBuf(expenses), { name: `${dir}بيانات/المصاريف.json` });
    archive.append(jsonBuf(events), { name: `${dir}بيانات/الأحداث.json` });

    /* Internal (optional) */
    if (includeInternal && confNotes.length > 0) {
      archive.append(jsonBuf(confNotes), { name: `${dir}داخلي/الملاحظات-السرية.json` });
    }

    archive.finalize();
  });
}
