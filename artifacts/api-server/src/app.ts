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
// Trust Replit's load-balancer proxy so X-Forwarded-For is handled correctly
// (required for express-rate-limit and accurate IP detection in production)
app.set("trust proxy", 1);

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
    // Allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);
    // Always allow in development
    if (process.env["NODE_ENV"] === "development") return callback(null, true);
    // Allow any *.replit.app or *.replit.dev domain (Replit deployments)
    if (/\.replit\.(app|dev)$/.test(origin)) return callback(null, true);
    // Allow explicitly configured origins
    const extra = (process.env["FRONTEND_URL"] ?? "").split(",").map((u) => u.trim()).filter(Boolean);
    if (extra.includes(origin)) return callback(null, true);
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
