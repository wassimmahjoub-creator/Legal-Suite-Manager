import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { invoicesTable } from "./invoices";

export const invoiceLinesTable = pgTable("invoice_lines", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .references(() => invoicesTable.id, { onDelete: "cascade" })
    .notNull(),
  position: integer("position").notNull().default(0),
  description: text("description").notNull(),
  unit: text("unit").default("forfait"),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("1"),
  unitPriceHt: numeric("unit_price_ht", { precision: 12, scale: 3 }).notNull().default("0"),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("19"),
  lineTotalHt: numeric("line_total_ht", { precision: 12, scale: 3 }).notNull().default("0"),
  lineVat: numeric("line_vat", { precision: 12, scale: 3 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InvoiceLine = typeof invoiceLinesTable.$inferSelect;
