import { pgTable, text, serial, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const consultationsTable = pgTable("consultations", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clientsTable.id),
  subject: text("subject").notNull(),
  date: date("date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConsultationSchema = createInsertSchema(consultationsTable).omit({ id: true, createdAt: true });
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type Consultation = typeof consultationsTable.$inferSelect;
