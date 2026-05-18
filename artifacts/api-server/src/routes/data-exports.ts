import { Router } from "express";
import { createReadStream } from "fs";
import { basename } from "path";
import { DataExportService, verifyDownloadToken } from "../services/dataExportService.js";

const router = Router();

/* POST /data-exports — create new export */
router.post("/data-exports", async (req, res) => {
  const user = (req as any).user;
  const { exportType, scopeId } = req.body as {
    exportType: string;
    scopeId?: number;
  };

  if (!["full_cabinet", "single_client", "single_case"].includes(exportType)) {
    return res.status(400).json({ error: "نوع التصدير غير صالح" });
  }

  if (exportType === "full_cabinet" && user.role !== "admin") {
    return res.status(403).json({ error: "هذا الإجراء مخصص للمدير فقط" });
  }

  try {
    const exp = await DataExportService.createExport({
      requestedBy: user.id,
      exportType: exportType as "full_cabinet" | "single_client" | "single_case",
      scopeId: scopeId ? Number(scopeId) : undefined,
    });
    return res.status(201).json(exp);
  } catch (err: any) {
    if (err?.code === "QUOTA_EXCEEDED") {
      return res.status(429).json({ error: "تصدير واحد فقط كل 24 ساعة" });
    }
    req.log.error({ err }, "data-exports: create failed");
    return res.status(500).json({ error: "فشل إنشاء طلب التصدير" });
  }
});

/* GET /data-exports — list exports */
router.get("/data-exports", async (req, res) => {
  const user = (req as any).user;
  const isAdmin = user.role === "admin";
  const exports = await DataExportService.list(user.id, isAdmin);
  return res.json(exports);
});

/* GET /data-exports/:id — single export status */
router.get("/data-exports/:id", async (req, res) => {
  const user = (req as any).user;
  const exp = await DataExportService.getById(Number(req.params.id));
  if (!exp) return res.status(404).json({ error: "غير موجود" });
  if (exp.requestedBy !== user.id && user.role !== "admin") {
    return res.status(403).json({ error: "غير مصرّح" });
  }
  return res.json(exp);
});

/* GET /data-exports/:id/download?token=... — download ZIP */
router.get("/data-exports/:id/download", async (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  const token = req.query.token as string | undefined;

  const exp = await DataExportService.getById(id);
  if (!exp) return res.status(404).json({ error: "غير موجود" });

  if (exp.requestedBy !== user.id && user.role !== "admin") {
    return res.status(403).json({ error: "غير مصرّح" });
  }

  if (exp.status !== "completed" || !exp.filePath || !exp.downloadToken) {
    return res.status(400).json({ error: "التصدير غير جاهز بعد" });
  }

  if (token && !verifyDownloadToken(id, token)) {
    return res.status(403).json({ error: "رابط التنزيل منتهي الصلاحية" });
  }

  await DataExportService.incrementDownload(id);

  const fileName = basename(exp.filePath);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const stream = createReadStream(exp.filePath);
  stream.on("error", () => res.status(500).end());
  stream.pipe(res);
});

export default router;
