import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();
const SERVER_START = Date.now();

router.get("/healthz", async (_req, res) => {
  const uptime = Math.floor((Date.now() - SERVER_START) / 1000);
  const mem = process.memoryUsage();

  try {
    await db.execute(sql`SELECT 1`);

    res.json({
      status: "ok",
      uptime,
      memory: {
        heapUsedMb: Math.round(mem.heapUsed / 1_048_576),
        heapTotalMb: Math.round(mem.heapTotal / 1_048_576),
        rssMb: Math.round(mem.rss / 1_048_576),
      },
      db: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: "degraded",
      uptime,
      db: "error",
      error: err instanceof Error ? err.message : "unknown",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
