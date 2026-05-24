import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import hpp from "hpp";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { generalApiLimiter, sanitizeBody } from "./middleware/security.js";
import { requestId } from "./middleware/requestId.js";

const app: Express = express();
app.set("etag", false); // Disable ETags — prevents stale 304s for dynamic API data

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
app.use(cookieParser());
app.use(
  helmet({
    contentSecurityPolicy:    false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(hpp());
app.use(requestId);
app.use(sanitizeBody);
app.use("/api", generalApiLimiter);

// Disable HTTP caching for all API responses so clients always get fresh data
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use("/api", router);

// ── Serve built React frontend in production ──────────────────────────────
// The Vite build outputs to artifacts/law-firm/dist/public/
// From this file (artifacts/api-server/src/), the compiled dist is one level up,
// so relative to dist/index.mjs → ../../law-firm/dist/public
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, "../../law-firm/dist/public");

app.use(express.static(frontendDist));

// Fallback: serve index.html for all non-API routes (client-side routing)
app.get("*splat", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

export default app;
