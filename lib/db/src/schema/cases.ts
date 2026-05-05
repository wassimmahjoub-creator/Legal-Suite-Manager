import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  clientId: integer("client_id").references(() => clientsTable.id).notNull(),
  status: text("status").notNull().default("active"),
  court: text("court"),
  lawyer: text("lawyer"),
  nextHearing: date("next_hearing"),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCaseSchema = createInsertSchema(casesTable).omit({ id: true, createdAt: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof casesTable.$inferSelect;
