import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const proceduresTable = pgTable("procedures", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id).notNull(),
  stage: text("stage").notNull().default("ابتدائي"),
  status: text("status").notNull().default("جارية"),
  notes: text("notes"),
  startedAt: date("started_at"),
  endedAt: date("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProcedureSchema = createInsertSchema(proceduresTable).omit({ id: true, createdAt: true });
export type InsertProcedure = z.infer<typeof insertProcedureSchema>;
export type Procedure = typeof proceduresTable.$inferSelect;
