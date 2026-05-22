import { pgTable, text, serial, integer, numeric, date, timestamp, index, pgEnum, unique } from "drizzle-orm/pg-core";
import { casesTable } from "./cases";
import { organizationsTable } from "./organizations";

export const contractTypeEnum = pgEnum("contract_type", [
  "sale", "rental", "service", "employment", "partnership",
  "loan", "guarantee", "agency", "franchise", "other",
]);

export const contractStatusEnum = pgEnum("contract_status", [
  "draft", "under_review", "ready_to_sign", "signed", "expired", "terminated",
]);

export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id, { onDelete: "cascade" }).notNull().unique(),
  contractType: contractTypeEnum("contract_type").notNull().default("other"),
  partyOneName: text("party_one_name"),
  partyOneTaxId: text("party_one_tax_id"),
  partyTwoName: text("party_two_name"),
  partyTwoTaxId: text("party_two_tax_id"),
  contractValue: numeric("contract_value", { precision: 14, scale: 3 }),
  contractCurrency: text("contract_currency").notNull().default("TND"),
  status: contractStatusEnum("status").notNull().default("draft"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  signingDate: date("signing_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  caseIdx: index("contracts_case_idx").on(t.caseId),
}));

export const contractVersionsTable = pgTable("contract_versions", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => contractsTable.id, { onDelete: "cascade" }).notNull(),
  versionNumber: integer("version_number").notNull(),
  documentId: integer("document_id"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqueVersion: unique("contract_versions_unique").on(t.contractId, t.versionNumber),
}));
