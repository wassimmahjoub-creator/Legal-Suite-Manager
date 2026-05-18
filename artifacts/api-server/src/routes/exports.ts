import { Router } from "express";
import {
  exportClientsXlsx, exportClientsCsv,
  exportCasesXlsx, exportCasesCsv,
  exportInvoicesXlsx, exportInvoicesCsv,
} from "../services/tableExportService.js";

const router = Router();

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ── GET /exports/clients ──────────────────────────────────────────── */
router.get("/exports/clients", async (req, res) => {
  const format = (req.query.format as string) || "xlsx";
  const search = (req.query.search as string) || undefined;

  try {
    if (format === "csv") {
      const buf = await exportClientsCsv({ search });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="clients-${todayStr()}.csv"`);
      return res.send(buf);
    }
    const buf = await exportClientsXlsx({ search });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="clients-${todayStr()}.xlsx"`);
    return res.send(buf);
  } catch (err) {
    req.log.error({ err }, "exports: clients failed");
    return res.status(500).json({ error: "فشل إنشاء الملف" });
  }
});

/* ── GET /exports/cases ────────────────────────────────────────────── */
router.get("/exports/cases", async (req, res) => {
  const format = (req.query.format as string) || "xlsx";
  const search = (req.query.search as string) || undefined;
  const status = (req.query.status as string) || undefined;
  const archived = req.query.archived === "true";

  try {
    if (format === "csv") {
      const buf = await exportCasesCsv({ search, status, archived });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="dossiers-${todayStr()}.csv"`);
      return res.send(buf);
    }
    const buf = await exportCasesXlsx({ search, status, archived });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="dossiers-${todayStr()}.xlsx"`);
    return res.send(buf);
  } catch (err) {
    req.log.error({ err }, "exports: cases failed");
    return res.status(500).json({ error: "فشل إنشاء الملف" });
  }
});

/* ── GET /exports/invoices ─────────────────────────────────────────── */
router.get("/exports/invoices", async (req, res) => {
  const format = (req.query.format as string) || "xlsx";
  const search = (req.query.search as string) || undefined;
  const status = (req.query.status as string) || undefined;

  try {
    if (format === "csv") {
      const buf = await exportInvoicesCsv({ search, status });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="factures-${todayStr()}.csv"`);
      return res.send(buf);
    }
    const buf = await exportInvoicesXlsx({ search, status });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="factures-${todayStr()}.xlsx"`);
    return res.send(buf);
  } catch (err) {
    req.log.error({ err }, "exports: invoices failed");
    return res.status(500).json({ error: "فشل إنشاء الملف" });
  }
});

export default router;
