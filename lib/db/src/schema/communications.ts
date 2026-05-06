import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";
import { clientsTable } from "./clients";

export const communicationsTable = pgTable("communications", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id),
  clientId: integer("client_id").references(() => clientsTable.id),
  type: text("type").notNull().default("call"),
  date: date("date").notNull(),
  summary: text("summary").notNull(),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommunicationSchema = createInsertSchema(communicationsTable).omit({ id: true, createdAt: true });
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communicationsTable.$inferSelect;
