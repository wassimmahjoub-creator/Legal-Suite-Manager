import { pgTable, text, serial, integer, numeric, date, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { casesTable } from "./cases";

export const debtStageEnum = pgEnum("debt_stage", [
  "notice", "negotiation", "lawsuit", "execution", "completed",
]);

export const debtRecoveryFilesTable = pgTable("debt_recovery_files", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id, { onDelete: "cascade" }).notNull().unique(),
  debtorName: text("debtor_name").notNull(),
  debtorTaxId: text("debtor_tax_id"),
  debtorPhone: text("debtor_phone"),
  debtorAddress: text("debtor_address"),
  debtAmount: numeric("debt_amount", { precision: 14, scale: 3 }).notNull(),
  recoveredAmount: numeric("recovered_amount", { precision: 14, scale: 3 }).notNull().default("0"),
  debtReason: text("debt_reason"),
  dueDate: date("due_date"),
  currentStage: debtStageEnum("current_stage").notNull().default("notice"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  caseIdx: index("debt_recovery_case_idx").on(t.caseId),
}));

export const debtRecoveryPaymentsTable = pgTable("debt_recovery_payments", {
  id: serial("id").primaryKey(),
  debtRecoveryFileId: integer("debt_recovery_file_id").references(() => debtRecoveryFilesTable.id, { onDelete: "cascade" }).notNull(),
  receivedAt: timestamp("received_at").notNull(),
  amount: numeric("amount", { precision: 14, scale: 3 }).notNull(),
  paymentMethod: text("payment_method"),
  reference: text("reference"),
  notes: text("notes"),
  recordedBy: integer("recorded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
