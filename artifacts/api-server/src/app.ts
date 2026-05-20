import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { generalApiLimiter, sanitizeBody } from "./middleware/security.js";

const app: Express = express();

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isDev = process.env["NODE_ENV"] === "development";
    if (isDev) return callback(null, true);
    const allowed = (process.env["FRONTEND_URL"] ?? "").split(",").map((u) => u.trim()).filter(Boolean);
    if (allowed.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(sanitizeBody);
app.use("/api", generalApiLimiter);

app.use("/api", router);

const basePath = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";
app.use(`${basePath}/api/uploads/files`, express.static(UPLOADS_DIR, {
  setHeaders(res) {
    res.setHeader("Cache-Control", "public, max-age=31536000");
  },
}));

export default app;
