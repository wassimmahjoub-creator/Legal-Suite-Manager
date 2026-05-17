import { pgTable, text, serial, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clientType: text("client_type").default("individual"),
  legalForm: text("legal_form"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  cin: text("cin"),
  taxId: text("tax_id"),
  commercialRegister: text("commercial_register"),
  rib: text("rib"),
  withholdingRate: numeric("withholding_rate").default("0"),
  withholdingExempt: boolean("withholding_exempt").default(false),
  officeSeq: text("office_seq"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
