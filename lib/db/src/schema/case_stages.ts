import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { casesTable } from "./cases";
import { courtsTable } from "./courts";
import { usersTable } from "./users";

export const caseStagesTable = pgTable("case_stages", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id, { onDelete: "cascade" }).notNull(),
  stage: text("stage").notNull(), // first_instance | appeal | cassation | execution
  enteredAt: timestamp("entered_at", { withTimezone: true }).defaultNow().notNull(),
  exitedAt: timestamp("exited_at", { withTimezone: true }),
  courtId: integer("court_id").references(() => courtsTable.id),
  courtCaseNumber: text("court_case_number"),
  decisionDate: date("decision_date"),
  decisionSummary: text("decision_summary"),
  decisionOutcome: text("decision_outcome"), // favorable | unfavorable | mixed
  executionStatus: text("execution_status").default("not_started"),
  executionNotes: text("execution_notes"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type CaseStage = typeof caseStagesTable.$inferSelect;
export type InsertCaseStage = typeof caseStagesTable.$inferInsert;
