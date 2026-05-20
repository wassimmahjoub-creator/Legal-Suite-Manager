import { pgTable, text, serial, integer, timestamp, numeric, boolean, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizationsTable.id).notNull(),
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
}, (table) => ({
  orgDeletedIdx: index("clients_org_deleted_idx").on(table.orgId, table.deletedAt),
  orgCreatedIdx: index("clients_org_created_idx").on(table.orgId, table.createdAt),
}));

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
