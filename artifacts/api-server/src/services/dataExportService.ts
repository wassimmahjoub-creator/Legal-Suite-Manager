import ExcelJS from "exceljs";
import { ZipArchive } from "archiver";
import { createWriteStream, mkdirSync, statSync } from "fs";
import { join } from "path";
import { createHmac } from "crypto";
import {
  db, dataExportsTable,
  clientsTable, casesTable, usersTable, opponentsTable,
  invoicesTable, caseTeamsTable, legalDeadlinesTable,
  caseEventsTable, expensesTable, conflictChecksTable,
} from "@workspace/db";
import { eq, isNull, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export type ExportType = "full_cabinet" | "single_client" | "single_case";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "fallback-secret";
const EXPORTS_DIR = join(process.cwd(), "..", "..", "storage", "exports");

/* ── Token helpers ────────────────────────────────────────── */

export function makeDownloadToken(exportId: number, expiresAt: Date): string {
  const iso = expiresAt.toISOString();
  const hmac = createHmac("sha256", SESSION_SECRET)
    .update(`${exportId}:${iso}`)
    .digest("hex");
  return `${hmac}:${iso}`;
}

export function verifyDownloadToken(exportId: number, token: string): boolean {
  const colonIdx = token.indexOf(":");
  if (colonIdx < 0) return false;
  const hmac = token.slice(0, colonIdx);
  const iso = token.slice(colonIdx + 1);
  const expiresAt = new Date(iso);
  if (isNaN(expiresAt.getTime()) || expiresAt < new Date()) return false;
  const expected = createHmac("sha256", SESSION_SECRET)
    .update(`${exportId}:${iso}`)
    .digest("hex");
  return hmac === expected;
}

/* ── XLSX style helpers ──────────────────────────────────── */

const GOLD_ARGB  = "FFD4AF37";
const WHITE_ARGB = "FFFFFFFF";

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

function applyGoldHeader(ws: ExcelJS.Worksheet, colCount: number) {
  const row = ws.getRow(1);
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font      = { bold: true, color: { argb: WHITE_ARGB }, name: "Cairo", size: 10 };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD_ARGB } };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    cell.border    = { bottom: { style: "thin", color: { argb: "FF8B6914" } } };
  }
  row.height = 22;
}

function styleDataRows(ws: ExcelJS.Worksheet, rowCount: number, colCount: number) {
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

function autoWidths(ws: ExcelJS.Worksheet, headers: string[], data: (string | number | null | undefined)[][]) {
  headers.forEach((h, i) => {
    const maxData = data.reduce((max, row) => {
      const len = String(row[i] ?? "").length;
      return len > max ? len : max;
    }, 0);
    ws.getColumn(i + 1).width = Math.min(Math.max(h.length * 1.6, maxData, 10), 55);
  });
}

function setRtlView(ws: ExcelJS.Worksheet) {
  ws.views = [{ rightToLeft: true, state: "normal" }];
}

function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const ws = wb.addWorksheet(name);
  setRtlView(ws);
  ws.addRow(headers);
  applyGoldHeader(ws, headers.length);
  rows.forEach(r => ws.addRow(r));
  styleDataRows(ws, rows.length, headers.length);
  autoWidths(ws, headers, rows);
}

/* ── ZIP builder ─────────────────────────────────────────── */

type ZipEntry = Buffer | string;

function buildZip(files: Record<string, ZipEntry>, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output  = createWriteStream(filePath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);

    for (const [name, content] of Object.entries(files)) {
      const buf = typeof content === "string" ? Buffer.from(content, "utf8") : content;
      archive.append(buf, { name });
    }

    archive.finalize();
  });
}

/* ── Data helpers ────────────────────────────────────────── */

async function safeExec(query: ReturnType<typeof sql>): Promise<unknown[]> {
  const r = await db.execute(query);
  return Array.isArray(r) ? r : ((r as { rows?: unknown[] }).rows ?? []);
}

/* ── Full cabinet — multi-sheet XLSX ─────────────────────── */

async function buildFullCabinetXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "محامي بلوس (Mahami Plus)";

  /* Sheet 1: Organization */
  const orgRows = await safeExec(sql`SELECT * FROM organizations LIMIT 1`);
  const org = (orgRows[0] as Record<string, unknown>) ?? {};
  addSheet(wb, "المكتب", ["البيان", "القيمة"], [
    ["اسم المكتب",       String(org.name ?? "")],
    ["البريد الإلكتروني", String(org.email ?? "")],
    ["الهاتف",           String(org.phone ?? "")],
    ["العنوان",           String(org.address ?? "")],
    ["المدينة",           String(org.city ?? "")],
    ["الترقيم الجبائي",  String(org.taxId ?? "")],
  ]);

  /* Sheet 2: Users */
  const users = await db.select({
    id: usersTable.id, name: usersTable.name,
    email: usersTable.email, role: usersTable.role,
    createdAt: usersTable.createdAt,
  }).from(usersTable);
  addSheet(wb, "المستخدمون",
    ["الرقم", "الاسم", "البريد", "الدور", "تاريخ الإنشاء"],
    users.map(u => [u.id, u.name ?? "", u.email ?? "", u.role ?? "", fmtDate(u.createdAt)]),
  );

  /* Sheet 3: Clients */
  const clients = await db.select().from(clientsTable).where(isNull(clientsTable.deletedAt));
  addSheet(wb, "الموكّلون",
    ["الرقم", "الاسم", "الهاتف", "البريد", "العنوان", "رقم الهوية", "تاريخ الإنشاء"],
    clients.map(c => [c.id, c.name ?? "", c.phone ?? "", c.email ?? "", c.address ?? "", c.cin ?? "", fmtDate(c.createdAt)]),
  );

  /* Sheet 4: Cases */
  const cases = await db.select().from(casesTable).where(isNull(casesTable.deletedAt));
  addSheet(wb, "القضايا",
    ["الرقم", "رقم الملف", "العنوان", "المحكمة", "الدائرة", "الحالة", "المرحلة الإجرائية", "الجلسة القادمة", "تاريخ الإنشاء"],
    cases.map(c => [
      c.id, c.caseNumber ?? "", c.title ?? "", c.court ?? "", c.division ?? "",
      c.status ?? "", c.procedureStage ?? "", fmtDate(c.nextHearing), fmtDate(c.createdAt),
    ]),
  );

  /* Sheet 5: Invoices */
  const invoices = await db.select().from(invoicesTable).where(isNull(invoicesTable.deletedAt));
  addSheet(wb, "الفواتير",
    ["الرقم", "العنوان", "المبلغ الإجمالي", "المدفوع", "الرصيد", "الحالة", "تاريخ الاستحقاق", "تاريخ الإنشاء"],
    invoices.map(inv => [
      inv.id, inv.title ?? "",
      fmtNum(inv.totalAmount), fmtNum(inv.paidAmount),
      fmtNum(String(Number(inv.totalAmount ?? 0) - Number(inv.paidAmount ?? 0))),
      inv.status ?? "", fmtDate(inv.dueDate), fmtDate(inv.createdAt),
    ]),
  );

  /* Sheet 6: Expenses */
  const expenses = await db.select().from(expensesTable);
  addSheet(wb, "المصاريف",
    ["الرقم", "التسمية", "المبلغ", "العملة", "الفئة", "التاريخ", "ملاحظات"],
    expenses.map(e => [
      e.id, e.label ?? "", fmtNum(e.amount), e.currency ?? "TND",
      e.category ?? "", fmtDate(e.date), e.notes ?? "",
    ]),
  );

  /* Sheet 7: Audit logs */
  const auditRows = await safeExec(sql`SELECT id, entity_type, entity_id, action, user_id, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5000`);
  addSheet(wb, "سجل التعديلات",
    ["الرقم", "نوع الكيان", "معرّف الكيان", "الإجراء", "المستخدم", "التاريخ"],
    (auditRows as Record<string, unknown>[]).map(r => [
      String(r.id ?? ""), String(r.entity_type ?? ""), String(r.entity_id ?? ""),
      String(r.action ?? ""), String(r.user_id ?? ""), fmtDate(r.created_at as string),
    ]),
  );

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/* ── Client data — multi-sheet XLSX ─────────────────────── */

async function buildClientXlsx(clientId: number): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "محامي بلوس (Mahami Plus)";

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
  if (!client) throw new Error(`Client ${clientId} not found`);

  addSheet(wb, "بيانات الموكّل", ["البيان", "القيمة"], [
    ["الاسم",       client.name ?? ""],
    ["الهاتف",      client.phone ?? ""],
    ["البريد",      client.email ?? ""],
    ["العنوان",     client.address ?? ""],
    ["رقم الهوية",  client.cin ?? ""],
    ["تاريخ الإنشاء", fmtDate(client.createdAt)],
  ]);

  const cases = await db.select().from(casesTable)
    .where(and(eq(casesTable.clientId, clientId), isNull(casesTable.deletedAt)));
  addSheet(wb, "القضايا",
    ["الرقم", "رقم الملف", "العنوان", "المحكمة", "الحالة", "الجلسة القادمة"],
    cases.map(c => [c.id, c.caseNumber ?? "", c.title ?? "", c.court ?? "", c.status ?? "", fmtDate(c.nextHearing)]),
  );

  const invs = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.clientId, clientId), isNull(invoicesTable.deletedAt)));
  addSheet(wb, "الفواتير",
    ["الرقم", "العنوان", "الإجمالي", "المدفوع", "الرصيد", "الحالة", "تاريخ الاستحقاق"],
    invs.map(i => [
      i.id, i.title ?? "", fmtNum(i.totalAmount), fmtNum(i.paidAmount),
      fmtNum(String(Number(i.totalAmount ?? 0) - Number(i.paidAmount ?? 0))),
      i.status ?? "", fmtDate(i.dueDate),
    ]),
  );

  for (const c of cases) {
    const deadlines = await db.select().from(legalDeadlinesTable).where(eq(legalDeadlinesTable.caseId, c.id));
    if (deadlines.length > 0) {
      addSheet(wb, `آجال-${c.caseNumber ?? c.id}`.slice(0, 31),
        ["النوع", "تاريخ الانطلاق", "تاريخ الانتهاء", "الحالة", "ملاحظات"],
        deadlines.map(d => [d.type ?? "", fmtDate(d.startDate), fmtDate(d.dueDate), d.status ?? "", d.notes ?? ""]),
      );
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/* ── Case data — multi-sheet XLSX ───────────────────────── */

async function buildCaseXlsx(caseId: number): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "محامي بلوس (Mahami Plus)";

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, caseId));
  if (!caseRow) throw new Error(`Case ${caseId} not found`);

  addSheet(wb, "القضية", ["البيان", "القيمة"], [
    ["رقم الملف",        caseRow.caseNumber ?? ""],
    ["العنوان",           caseRow.title ?? ""],
    ["المحكمة",           caseRow.court ?? ""],
    ["الدائرة",           caseRow.division ?? ""],
    ["الحالة",            caseRow.status ?? ""],
    ["المرحلة الإجرائية", caseRow.procedureStage ?? ""],
    ["الجلسة القادمة",    fmtDate(caseRow.nextHearing)],
    ["الوصف",             caseRow.description ?? ""],
    ["تاريخ الإنشاء",    fmtDate(caseRow.createdAt)],
  ]);

  const opponents = await db.select().from(opponentsTable).where(eq(opponentsTable.caseId, caseId));
  addSheet(wb, "الخصوم",
    ["الرقم", "الاسم", "الهاتف", "المحامي", "الجهة"],
    opponents.map(o => [o.id, o.name ?? "", o.phone ?? "", o.lawyer ?? "", o.organization ?? ""]),
  );

  const team = await db.select().from(caseTeamsTable).where(eq(caseTeamsTable.caseId, caseId));
  addSheet(wb, "الفريق",
    ["الرقم", "المستخدم", "الدور"],
    team.map(t => [t.id, String(t.userId ?? ""), t.role ?? ""]),
  );

  const timeline = await db.select().from(caseEventsTable).where(eq(caseEventsTable.caseId, caseId));
  addSheet(wb, "الجلسات",
    ["الرقم", "العنوان", "التاريخ", "النوع", "النتيجة", "الحالة القانونية"],
    timeline.map(e => [e.id, e.title ?? "", fmtDate(e.date), e.type ?? "", e.result ?? "", e.legalStatus ?? ""]),
  );

  const deadlines = await db.select().from(legalDeadlinesTable).where(eq(legalDeadlinesTable.caseId, caseId));
  addSheet(wb, "الآجال",
    ["الرقم", "النوع", "تاريخ الانطلاق", "تاريخ الانتهاء", "الحالة", "ملاحظات"],
    deadlines.map(d => [d.id, d.type ?? "", fmtDate(d.startDate), fmtDate(d.dueDate), d.status ?? "", d.notes ?? ""]),
  );

  const invs = await db.select().from(invoicesTable).where(eq(invoicesTable.caseId, caseId));
  addSheet(wb, "الفواتير",
    ["الرقم", "العنوان", "الإجمالي", "المدفوع", "الحالة", "تاريخ الاستحقاق"],
    invs.map(i => [i.id, i.title ?? "", fmtNum(i.totalAmount), fmtNum(i.paidAmount), i.status ?? "", fmtDate(i.dueDate)]),
  );

  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.caseId, caseId));
  addSheet(wb, "المصاريف",
    ["الرقم", "التسمية", "المبلغ", "العملة", "الفئة", "التاريخ"],
    expenses.map(e => [e.id, e.label ?? "", fmtNum(e.amount), e.currency ?? "TND", e.category ?? "", fmtDate(e.date)]),
  );

  const conflicts = await db.select().from(conflictChecksTable).where(eq(conflictChecksTable.caseId, caseId));
  if (conflicts.length > 0) {
    addSheet(wb, "تعارض المصالح",
      ["الرقم", "الاسم المستعلم عنه", "النتيجة", "التاريخ"],
      conflicts.map(c => [c.id, c.searchedName ?? "", c.result ?? "", fmtDate(c.createdAt)]),
    );
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/* ── Gather functions (return ZipEntry maps) ─────────────── */

async function gatherFullCabinet(): Promise<Record<string, ZipEntry>> {
  const now = new Date().toLocaleString("ar-TN");
  const xlsxBuf = await buildFullCabinetXlsx();

  const readme =
    `تصدير بيانات المكتب — محامي بلوس (Mahami Plus)\n` +
    `تاريخ التصدير: ${now}\n\n` +
    `المحتويات:\n` +
    `  بيانات-المكتب.xlsx — جميع بيانات المكتب (7 جداول):\n` +
    `    • المكتب           — إعدادات المكتب\n` +
    `    • المستخدمون       — قائمة المستخدمين والأدوار\n` +
    `    • الموكّلون        — جميع الموكّلين\n` +
    `    • القضايا          — جميع الملفات القضائية\n` +
    `    • الفواتير         — جميع الفواتير\n` +
    `    • المصاريف         — جميع المصاريف\n` +
    `    • سجل التعديلات    — آخر 5000 تعديل\n` +
    `  audit/manifest.json — بصمة SHA-256 لكل ملف\n\n` +
    `⚠️  هذا الملف يحتوي على بيانات سرية. احتفظ به في مكان آمن.\n`;

  return {
    "README.txt": readme,
    "بيانات-المكتب.xlsx": xlsxBuf,
  };
}

async function gatherClientData(clientId: number): Promise<Record<string, ZipEntry>> {
  const now = new Date().toLocaleString("ar-TN");
  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, clientId));
  const xlsxBuf = await buildClientXlsx(clientId);

  const readme =
    `تصدير بيانات موكّل — محامي بلوس\n` +
    `الموكّل: ${client?.name ?? clientId}\n` +
    `تاريخ التصدير: ${now}\n\n` +
    `المحتويات:\n` +
    `  بيانات-الموكّل.xlsx — بيانات الموكّل، قضاياه، فواتيره، وآجاله\n`;

  return {
    "README.txt": readme,
    "بيانات-الموكّل.xlsx": xlsxBuf,
  };
}

async function gatherCaseData(caseId: number): Promise<Record<string, ZipEntry>> {
  const now = new Date().toLocaleString("ar-TN");
  const [caseRow] = await db.select({ title: casesTable.title, caseNumber: casesTable.caseNumber })
    .from(casesTable).where(eq(casesTable.id, caseId));
  const xlsxBuf = await buildCaseXlsx(caseId);

  const label = caseRow?.caseNumber ?? `ملف-${caseId}`;
  const readme =
    `تصدير ملف قضائي — محامي بلوس\n` +
    `الملف: ${label} — ${caseRow?.title ?? ""}\n` +
    `تاريخ التصدير: ${now}\n\n` +
    `المحتويات:\n` +
    `  بيانات-الملف.xlsx — القضية، الخصوم، الفريق، الجلسات، الآجال، الفواتير، المصاريف\n`;

  return {
    "README.txt": readme,
    "بيانات-الملف.xlsx": xlsxBuf,
  };
}

/* ── Public service ──────────────────────────────────────── */

export const DataExportService = {
  async createExport(opts: {
    requestedBy: number;
    exportType: ExportType;
    scopeId?: number;
  }) {
    // Quota: 1 full_cabinet export per 24 h per user
    if (opts.exportType === "full_cabinet") {
      const recent = await db
        .select({ id: dataExportsTable.id })
        .from(dataExportsTable)
        .where(
          sql`export_type = 'full_cabinet' AND requested_by = ${opts.requestedBy} AND created_at > now() - interval '24 hours'`,
        );
      if (recent.length > 0) {
        throw Object.assign(new Error("QUOTA_EXCEEDED"), { code: "QUOTA_EXCEEDED" });
      }
    }

    const [row] = await db
      .insert(dataExportsTable)
      .values({
        requestedBy: opts.requestedBy,
        exportType: opts.exportType,
        scopeId: opts.scopeId ?? null,
        status: "pending",
      })
      .returning();

    setImmediate(() => {
      void DataExportService.processExport(row.id).catch((err) => {
        logger.error({ err, exportId: row.id }, "data-export: unhandled error in processExport");
      });
    });

    return row;
  },

  async processExport(exportId: number): Promise<void> {
    await db
      .update(dataExportsTable)
      .set({ status: "processing", startedAt: new Date() })
      .where(eq(dataExportsTable.id, exportId));

    try {
      const [exp] = await db
        .select()
        .from(dataExportsTable)
        .where(eq(dataExportsTable.id, exportId));

      if (!exp) throw new Error("Export record not found");

      mkdirSync(EXPORTS_DIR, { recursive: true });
      const fileName = `export-${exportId}-${Date.now()}.zip`;
      const filePath = join(EXPORTS_DIR, fileName);

      let files: Record<string, ZipEntry>;
      if (exp.exportType === "full_cabinet") {
        files = await gatherFullCabinet();
      } else if (exp.exportType === "single_client" && exp.scopeId) {
        files = await gatherClientData(exp.scopeId);
      } else if (exp.exportType === "single_case" && exp.scopeId) {
        files = await gatherCaseData(exp.scopeId);
      } else {
        throw new Error(`Invalid export type or missing scopeId: ${exp.exportType}`);
      }

      await buildZip(files, filePath);

      const { size } = statSync(filePath);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const token = makeDownloadToken(exportId, expiresAt);

      await db
        .update(dataExportsTable)
        .set({
          status: "completed",
          completedAt: new Date(),
          filePath,
          fileSizeBytes: size,
          downloadToken: token,
          downloadExpiresAt: expiresAt,
        })
        .where(eq(dataExportsTable.id, exportId));

      logger.info({ exportId, size, exportType: exp.exportType }, "data-export: completed");
    } catch (err) {
      logger.error({ err, exportId }, "data-export: processing failed");
      await db
        .update(dataExportsTable)
        .set({ status: "failed", errorMessage: String(err) })
        .where(eq(dataExportsTable.id, exportId));
    }
  },

  async list(userId: number, isAdmin: boolean) {
    if (isAdmin) {
      return db
        .select()
        .from(dataExportsTable)
        .orderBy(sql`created_at DESC`)
        .limit(100);
    }
    return db
      .select()
      .from(dataExportsTable)
      .where(eq(dataExportsTable.requestedBy, userId))
      .orderBy(sql`created_at DESC`)
      .limit(50);
  },

  async getById(id: number) {
    const [row] = await db
      .select()
      .from(dataExportsTable)
      .where(eq(dataExportsTable.id, id));
    return row ?? null;
  },

  async incrementDownload(id: number) {
    await db
      .update(dataExportsTable)
      .set({ downloadCount: sql`download_count + 1` })
      .where(eq(dataExportsTable.id, id));
  },
};
