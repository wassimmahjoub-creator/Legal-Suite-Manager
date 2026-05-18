import { pgTable, text, serial, integer, timestamp, date, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id).notNull(),
  date: date("date").notNull(),
  typeValue: text("type_value").notNull(),
  description: text("description").notNull().default(""),
  amount: numeric("amount", { precision: 12, scale: 3 }).notNull(),
  reimbursable: boolean("reimbursable").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
