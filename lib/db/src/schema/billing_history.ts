import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const billingHistoryTable = pgTable("billing_history", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  amount: text("amount").notNull(),
  currency: text("currency").notNull().default("TND"),
  description: text("description").notNull(),
  status: text("status").notNull().default("paid"),
  billingCycle: text("billing_cycle"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BillingHistory = typeof billingHistoryTable.$inferSelect;
