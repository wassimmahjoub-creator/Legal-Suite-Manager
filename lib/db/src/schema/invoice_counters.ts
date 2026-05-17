import { pgTable, integer } from "drizzle-orm/pg-core";

export const invoiceCountersTable = pgTable("invoice_counters", {
  year: integer("year").primaryKey(),
  lastNumber: integer("last_number").notNull().default(0),
});
