import { pgTable, text, serial, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { casesTable } from "./cases";
import { usersTable } from "./users";

export const conflictChecksTable = pgTable("conflict_checks", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id, { onDelete: "cascade" }).notNull(),
  conflictType: text("conflict_type").notNull(),
  conflictingEntityType: text("conflicting_entity_type").notNull(),
  conflictingEntityId: integer("conflicting_entity_id").notNull(),
  conflictingEntityName: text("conflicting_entity_name"),
  matchedOn: text("matched_on").notNull(),
  matchScore: numeric("match_score"),
  otherCaseId: integer("other_case_id").references(() => casesTable.id),
  otherCaseName: text("other_case_name"),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => usersTable.id),
  resolutionJustification: text("resolution_justification"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ConflictCheck = typeof conflictChecksTable.$inferSelect;
