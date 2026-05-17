import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const cabinetSettingsTable = pgTable("cabinet_settings", {
  id: serial("id").primaryKey(),
  cabinetName: text("cabinet_name"),
  cabinetTaxId: text("cabinet_tax_id"),
  cabinetRib: text("cabinet_rib"),
  cabinetRc: text("cabinet_rc"),
  cabinetAddress: text("cabinet_address"),
  cabinetPhone: text("cabinet_phone"),
  cabinetEmail: text("cabinet_email"),
  defaultPaymentTerms: text("default_payment_terms"),
  invoiceFooterAr: text("invoice_footer_ar"),
  invoiceFooterFr: text("invoice_footer_fr"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CabinetSettings = typeof cabinetSettingsTable.$inferSelect;
