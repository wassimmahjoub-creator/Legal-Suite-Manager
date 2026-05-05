import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  caseId: integer("case_id").references(() => casesTable.id),
  done: boolean("done").notNull().default(false),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
