import { Router } from "express";
import multer from "multer";
import { uploadToStorage } from "../services/objectStorage.js";
import { logger } from "../lib/logger.js";

const router = Router();

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/zip",
  "text/plain",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    ALLOWED_MIME.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error("نوع الملف غير مسموح به"));
  },
});

router.post("/uploads", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "لم يتم تحميل أي ملف" });
    return;
  }
  try {
    const { key, url } = await uploadToStorage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
    );
    res.status(201).json({
      filename: key,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url,
    });
  } catch (err) {
    logger.error({ err }, "Upload error");
    res.status(500).json({ error: "فشل رفع الملف، يرجى المحاولة مجدداً" });
  }
});

export default router;
