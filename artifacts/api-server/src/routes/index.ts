import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import casesRouter from "./cases";
import invoicesRouter from "./invoices";
import tasksRouter from "./tasks";
import eventsRouter from "./events";
import documentsRouter from "./documents";
import dashboardRouter from "./dashboard";
import voiceDictationRouter from "./voice-dictation";
import reportsRouter from "./reports";
import authRouter from "./auth";
import opponentsRouter from "./opponents";
import consultationsRouter from "./consultations";
import templatesRouter from "./templates";
import searchRouter from "./search";
import { requireAuth } from "../middleware/auth.js";

const router: IRouter = Router();

const PUBLIC_PATHS = ["/auth/status", "/auth/login", "/auth/setup", "/healthz"];

function softAuth(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_PATHS.some((p) => req.path === p || req.path.startsWith(p))) {
    return next();
  }
  return requireAuth(req, res, next);
}

router.use(softAuth);

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(clientsRouter);
router.use(casesRouter);
router.use(invoicesRouter);
router.use(tasksRouter);
router.use(eventsRouter);
router.use(documentsRouter);
router.use(voiceDictationRouter);
router.use(opponentsRouter);
router.use(consultationsRouter);
router.use(templatesRouter);
router.use(searchRouter);

export default router;
