// archiver v8 is ESM with named class exports
import { ZipArchive } from "archiver";
import { createWriteStream, mkdirSync, statSync } from "fs";
import { join } from "path";
import { createHmac, createHash } from "crypto";
import {
  db, dataExportsTable,
  clientsTable, casesTable, usersTable, opponentsTable,
  invoicesTable, caseTeamsTable, legalDeadlinesTable,
  caseEventsTable, expensesTable, conflictChecksTable,
} from "@workspace/db";
import { eq, isNull, and, lt, sql } from "drizzle-orm";
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

/* ── ZIP builder ─────────────────────────────────────────── */

function hashBuf(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function toJson(v: unknown): Buffer {
  return Buffer.from(JSON.stringify(v, null, 2), "utf8");
}

function buildZip(
  files: Record<string, unknown>,
  filePath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(filePath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    const manifest: Array<{ file: string; sha256: string; bytes: number }> = [];

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);

    for (const [name, content] of Object.entries(files)) {
      const buf =
        typeof content === "string"
          ? Buffer.from(content, "utf8")
          : toJson(content);
      manifest.push({ file: name, sha256: hashBuf(buf), bytes: buf.length });
      archive.append(buf, { name });
    }

    const mBuf = toJson({
      generatedAt: new Date().toISOString(),
      system: "محامي بلوس (Mahami Plus)",
      files: manifest,
    });
    archive.append(mBuf, { name: "audit/manifest.json" });

    archive.finalize();
  });
}

/* ── Data gathering helpers ──────────────────────────────── */

async function safeExec(query: ReturnType<typeof sql>): Promise<unknown[]> {
  const r = await db.execute(query);
  return Array.isArray(r) ? r : ((r as { rows?: unknown[] }).rows ?? []);
}

async function gatherFullCabinet(): Promise<Record<string, unknown>> {
  const files: Record<string, unknown> = {};
  const now = new Date().toISOString();

  files["README.txt"] =
    `تصدير بيانات المكتب — محامي بلوس (Mahami Plus)\n` +
    `تاريخ التصدير: ${now}\n\n` +
    `يحتوي هذا الملف على نسخة كاملة من بيانات مكتبك.\n` +
    `الملفات بصيغة JSON. يمكن فتحها بأي محرر نص.\n` +
    `تحتوي audit/manifest.json على بصمة SHA-256 لكل ملف.\n`;

  const org = await safeExec(sql`SELECT * FROM organizations LIMIT 1`);
  files["cabinet/settings.json"] = org[0] ?? {};

  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable);
  files["users/users.json"] = users;

  const clients = await db
    .select()
    .from(clientsTable)
    .where(isNull(clientsTable.deletedAt));
  files["clients/clients.json"] = clients;

  for (const c of clients) {
    files[`clients/per-client/client-${c.id}/client.json`] = c;
    const invs = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.clientId, c.id));
    files[`clients/per-client/client-${c.id}/financial-summary.json`] = {
      totalInvoices: invs.length,
      invoiceIds: invs.map((i) => i.id),
    };
  }

  const cases = await db
    .select()
    .from(casesTable)
    .where(isNull(casesTable.deletedAt));
  files["cases/cases.json"] = cases;

  for (const c of cases) {
    files[`cases/per-case/case-${c.id}/case.json`] = c;

    const opponents = await db
      .select()
      .from(opponentsTable)
      .where(eq(opponentsTable.caseId, c.id));
    files[`cases/per-case/case-${c.id}/opponents.json`] = opponents;

    const team = await db
      .select()
      .from(caseTeamsTable)
      .where(eq(caseTeamsTable.caseId, c.id));
    files[`cases/per-case/case-${c.id}/team.json`] = team;

    const caseEvents = await db
      .select()
      .from(caseEventsTable)
      .where(eq(caseEventsTable.caseId, c.id));
    files[`cases/per-case/case-${c.id}/timeline.json`] = caseEvents;

    const deadlines = await db
      .select()
      .from(legalDeadlinesTable)
      .where(eq(legalDeadlinesTable.caseId, c.id));
    files[`cases/per-case/case-${c.id}/deadlines.json`] = deadlines;

    const invs = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.caseId, c.id));
    files[`cases/per-case/case-${c.id}/invoices.json`] = invs;

    const expenses = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.caseId, c.id));
    files[`cases/per-case/case-${c.id}/expenses.json`] = expenses;

    const conflicts = await db
      .select()
      .from(conflictChecksTable)
      .where(eq(conflictChecksTable.caseId, c.id));
    files[`cases/per-case/case-${c.id}/conflicts.json`] = conflicts;
  }

  const allInvoices = await db.select().from(invoicesTable).where(isNull(invoicesTable.deletedAt));
  files["invoices/all.json"] = allInvoices;

  const auditRows = await safeExec(
    sql`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5000`,
  );
  files["audit/audit-logs.json"] = auditRows;

  return files;
}

async function gatherClientData(
  clientId: number,
): Promise<Record<string, unknown>> {
  const files: Record<string, unknown> = {};
  const now = new Date().toISOString();

  files["README.txt"] =
    `تصدير بيانات موكّل — محامي بلوس\nتاريخ التصدير: ${now}\nمعرف الموكّل: ${clientId}\n`;

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, clientId));
  if (!client) throw new Error(`Client ${clientId} not found`);
  files["client.json"] = client;

  const cases = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.clientId, clientId), isNull(casesTable.deletedAt)));
  files["cases/cases.json"] = cases;

  for (const c of cases) {
    files[`cases/case-${c.id}/case.json`] = c;
    const deadlines = await db
      .select()
      .from(legalDeadlinesTable)
      .where(eq(legalDeadlinesTable.caseId, c.id));
    files[`cases/case-${c.id}/deadlines.json`] = deadlines;
  }

  const invs = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.clientId, clientId), isNull(invoicesTable.deletedAt)));
  files["invoices/invoices.json"] = invs;

  files["financial-summary.json"] = {
    totalInvoices: invs.length,
    totalCases: cases.length,
    exportedAt: now,
  };

  return files;
}

async function gatherCaseData(
  caseId: number,
): Promise<Record<string, unknown>> {
  const files: Record<string, unknown> = {};
  const now = new Date().toISOString();

  files["README.txt"] =
    `تصدير بيانات ملف — محامي بلوس\nتاريخ التصدير: ${now}\nمعرف الملف: ${caseId}\n`;

  const [caseRow] = await db
    .select()
    .from(casesTable)
    .where(eq(casesTable.id, caseId));
  if (!caseRow) throw new Error(`Case ${caseId} not found`);
  files["case.json"] = caseRow;

  const opponents = await db
    .select()
    .from(opponentsTable)
    .where(eq(opponentsTable.caseId, caseId));
  files["opponents.json"] = opponents;

  const team = await db
    .select()
    .from(caseTeamsTable)
    .where(eq(caseTeamsTable.caseId, caseId));
  files["team.json"] = team;

  const timeline = await db
    .select()
    .from(caseEventsTable)
    .where(eq(caseEventsTable.caseId, caseId));
  files["timeline.json"] = timeline;

  const deadlines = await db
    .select()
    .from(legalDeadlinesTable)
    .where(eq(legalDeadlinesTable.caseId, caseId));
  files["deadlines.json"] = deadlines;

  const invs = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.caseId, caseId));
  files["invoices.json"] = invs;

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.caseId, caseId));
  files["expenses.json"] = expenses;

  const conflicts = await db
    .select()
    .from(conflictChecksTable)
    .where(eq(conflictChecksTable.caseId, caseId));
  files["conflicts.json"] = conflicts;

  return files;
}

/* ── Public service methods ──────────────────────────────── */

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

    // Fire and forget
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

      let files: Record<string, unknown>;
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
