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
import courtsRouter from "./courts";
import proceduresRouter from "./procedures";
import deadlinesRouter from "./deadlines";
import legalConfigRouter from "./legal-config";
import caseTeamsRouter from "./case-teams";
import communicationsRouter from "./communications";
import insuranceRouter from "./insurance-companies";
import bankAccountsRouter from "./bank-accounts";
import auditLogsRouter from "./audit-logs";
import caseRelationsRouter from "./case-relations";
import confidentialNotesRouter from "./confidential-notes";
import trashRouter from "./trash";
import correspondancesRouter from "./correspondances";
import organizationsRouter from "./organizations";
import usersMgmtRouter from "./users-mgmt";
import invitationsRouter from "./invitations";
import { requireAuth } from "../middleware/auth.js";

const router: IRouter = Router();

const PUBLIC_PATHS = [
  "/auth/status", "/auth/login", "/auth/setup", "/auth/register",
  "/auth/forgot-password", "/auth/reset-password",
  "/invitations/accept/", "/healthz", "/organization/plans",
];

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
router.use(courtsRouter);
router.use(proceduresRouter);
router.use(deadlinesRouter);
router.use(legalConfigRouter);
router.use(caseTeamsRouter);
router.use(communicationsRouter);
router.use(insuranceRouter);
router.use(bankAccountsRouter);
router.use(auditLogsRouter);
router.use(caseRelationsRouter);
router.use(confidentialNotesRouter);
router.use(trashRouter);
router.use(correspondancesRouter);
router.use(organizationsRouter);
router.use(usersMgmtRouter);
router.use(invitationsRouter);

export default router;
