import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const deadlinesTable = pgTable("deadlines", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id).notNull(),
  title: text("title").notNull(),
  type: text("type").notNull().default("custom"),
  dueDate: date("due_date").notNull(),
  reminderDate: date("reminder_date"),
  urgency: text("urgency").notNull().default("normal"),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDeadlineSchema = createInsertSchema(deadlinesTable).omit({ id: true, createdAt: true, completedAt: true });
export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;
export type Deadline = typeof deadlinesTable.$inferSelect;
