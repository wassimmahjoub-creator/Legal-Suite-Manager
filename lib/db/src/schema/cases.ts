import { pgTable, text, serial, integer, timestamp, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { organizationsTable } from "./organizations";

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  caseNumber: text("case_number"),
  courtCaseNumber: text("court_case_number"),
  clientFileRef: text("client_file_ref"),
  officeRef: text("office_ref"),
  title: text("title").notNull(),
  orgId: integer("org_id").references(() => organizationsTable.id).notNull(),
  clientId: integer("client_id").references(() => clientsTable.id).notNull(),
  status: text("status").notNull().default("active"),
  court: text("court"),
  division: text("division"),
  lawyer: text("lawyer"),
  nextHearing: date("next_hearing"),
  opponentName: text("opponent_name"),
  opponentLawyer: text("opponent_lawyer"),
  judgmentText: text("judgment_text"),
  description: text("description"),
  notes: text("notes"),
  procedureStage: text("procedure_stage").default("ابتدائي"),
  // ── Wizard fields ──────────────────────────────────────────────────
  caseType: text("case_type"),
  litigationDegree: text("litigation_degree"),
  procedureType: text("procedure_type"),
  casePriority: text("case_priority").default("normal"),
  feeMethod: text("fee_method"),
  agreedFees: text("agreed_fees"),
  hourlyRate: text("hourly_rate"),
  percentage: text("percentage"),
  percentageBasis: text("percentage_basis"),
  disputeValue: text("dispute_value"),
  clientSource: text("client_source"),
  judgeName: text("judge_name"),
  firstHearingDate: date("first_hearing_date"),
  openedAt: date("opened_at"),
  confidentialityLevel: text("confidentiality_level").default("normal"),
  internalNotes: text("internal_notes"),
  draftData: text("draft_data"),
  draftLastStep: integer("draft_last_step").default(1),
  // ── Timestamps ─────────────────────────────────────────────────────
  archivedAt: timestamp("archived_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgStatusIdx:  index("cases_org_status_idx").on(table.orgId, table.status, table.deletedAt),
  orgClientIdx:  index("cases_org_client_idx").on(table.orgId, table.clientId),
  orgCreatedIdx: index("cases_org_created_idx").on(table.orgId, table.createdAt),
}));

export const insertCaseSchema = createInsertSchema(casesTable).omit({ id: true, createdAt: true, archivedAt: true, deletedAt: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof casesTable.$inferSelect;
