import { pgTable, text, serial, integer, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { casesTable } from "./cases";
import { caseStagesTable } from "./case_stages";
import { usersTable } from "./users";

export const legalDeadlinesTable = pgTable("legal_deadlines", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id, { onDelete: "cascade" }).notNull(),
  caseStageId: integer("case_stage_id").references(() => caseStagesTable.id, { onDelete: "cascade" }),
  deadlineType: text("deadline_type").notNull().default("custom"),
  nameAr: text("name_ar").notNull(),
  startDate: date("start_date").notNull(),
  durationDays: integer("duration_days").notNull(),
  endDate: date("end_date"),
  reminderDaysBefore: integer("reminder_days_before").default(7),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completedNotes: text("completed_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: integer("created_by").references(() => usersTable.id),
});

export type LegalDeadline = typeof legalDeadlinesTable.$inferSelect;
export type InsertLegalDeadline = typeof legalDeadlinesTable.$inferInsert;
