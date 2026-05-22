import { pgTable, text, serial, integer, numeric, timestamp, index, pgEnum, unique } from "drizzle-orm/pg-core";
import { casesTable } from "./cases";

export const companyTypeEnum = pgEnum("company_type", [
  "sarl", "suarl", "sa", "single_person_company", "other",
]);

export const companyFilesTable = pgTable("company_files", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id, { onDelete: "cascade" }).notNull().unique(),
  companyType: companyTypeEnum("company_type").notNull().default("sarl"),
  proposedName: text("proposed_name"),
  capital: numeric("capital", { precision: 14, scale: 3 }),
  activity: text("activity"),
  taxId: text("tax_id"),
  rneNumber: text("rne_number"),
  procedureStatus: text("procedure_status"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  caseIdx: index("company_files_case_idx").on(t.caseId),
}));

export const companyPartnersTable = pgTable("company_partners", {
  id: serial("id").primaryKey(),
  companyFileId: integer("company_file_id").references(() => companyFilesTable.id, { onDelete: "cascade" }).notNull(),
  partnerName: text("partner_name").notNull(),
  partnerTaxId: text("partner_tax_id"),
  sharesPercentage: numeric("shares_percentage", { precision: 5, scale: 2 }),
  position: text("position"),
  positionOrder: integer("position_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companyCreationStepsTable = pgTable("company_creation_steps", {
  id: serial("id").primaryKey(),
  companyFileId: integer("company_file_id").references(() => companyFilesTable.id, { onDelete: "cascade" }).notNull(),
  stepNameAr: text("step_name_ar").notNull(),
  stepOrder: integer("step_order").notNull(),
  isCompleted: integer("is_completed").notNull().default(0),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
