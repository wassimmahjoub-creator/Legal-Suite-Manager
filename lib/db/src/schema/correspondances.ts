import { pgTable, serial, integer, text, timestamp, date } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";
import { casesTable } from "./cases";

export const correspondancesTable = pgTable("correspondances", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clientsTable.id).notNull(),
  caseId: integer("case_id").references(() => casesTable.id),
  type: text("type").notNull().default("letter"),
  direction: text("direction").notNull().default("outgoing"),
  date: date("date").notNull(),
  subject: text("subject").notNull(),
  content: text("content"),
  reference: text("reference"),
  status: text("status").notNull().default("sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Correspondance = typeof correspondancesTable.$inferSelect;
