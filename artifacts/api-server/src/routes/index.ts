import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import casesRouter from "./cases";
import invoicesRouter from "./invoices";
import tasksRouter from "./tasks";
import eventsRouter from "./events";
import documentsRouter from "./documents";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(clientsRouter);
router.use(casesRouter);
router.use(invoicesRouter);
router.use(tasksRouter);
router.use(eventsRouter);
router.use(documentsRouter);

export default router;
