import { pgTable, text, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bankAccountsTable = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  accountNumber: text("account_number"),
  bankName: text("bank_name"),
  balance: numeric("balance", { precision: 14, scale: 3 }).default("0"),
  currency: text("currency").default("TND"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBankAccountSchema = createInsertSchema(bankAccountsTable).omit({ id: true, createdAt: true });
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccountsTable.$inferSelect;
