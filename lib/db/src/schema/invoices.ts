import { pgTable, text, serial, integer, numeric, timestamp, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { clientsTable } from "./clients";
import { casesTable } from "./cases";

// status: draft | issued | partially_paid | paid | cancelled
export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizationsTable.id).notNull(),
  invoiceNumber: text("invoice_number").unique(),
  clientId: integer("client_id").references(() => clientsTable.id).notNull(),
  caseId: integer("case_id").references(() => casesTable.id),
  issueDate: date("issue_date"),
  dueDate: date("due_date"),
  status: text("status").notNull().default("draft"),
  subtotalHt: numeric("subtotal_ht", { precision: 12, scale: 3 }).notNull().default("0"),
  vatTotal: numeric("vat_total", { precision: 12, scale: 3 }).notNull().default("0"),
  stampDuty: numeric("stamp_duty", { precision: 12, scale: 3 }).notNull().default("1.000"),
  withholdingTax: numeric("withholding_tax", { precision: 12, scale: 3 }).notNull().default("0"),
  totalTtc: numeric("total_ttc", { precision: 12, scale: 3 }).notNull().default("0"),
  netToPay: numeric("net_to_pay", { precision: 12, scale: 3 }).notNull().default("0"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 3 }).notNull().default("0"),
  balanceDue: numeric("balance_due", { precision: 12, scale: 3 }).notNull().default("0"),
  paymentTerms: text("payment_terms"),
  notes: text("notes"),
  lockedAt: timestamp("locked_at"),
  cancelledByInvoiceId: integer("cancelled_by_invoice_id"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orgStatusIdx: index("invoices_org_status_idx").on(table.orgId, table.status, table.deletedAt),
  orgClientIdx: index("invoices_org_client_idx").on(table.orgId, table.clientId),
}));

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
