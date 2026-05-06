import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const insuranceCompaniesTable = pgTable("insurance_companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  contactPerson: text("contact_person"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInsuranceCompanySchema = createInsertSchema(insuranceCompaniesTable).omit({ id: true, createdAt: true });
export type InsertInsuranceCompany = z.infer<typeof insertInsuranceCompanySchema>;
export type InsuranceCompany = typeof insuranceCompaniesTable.$inferSelect;
