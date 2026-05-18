import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { casesTable } from "./cases";
import { usersTable } from "./users";

export const caseEventsTable = pgTable("case_events", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id, { onDelete: "cascade" }).notNull(),
  eventType: text("event_type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow(),
  titleAr: text("title_ar").notNull(),
  titleFr: text("title_fr"),
  description: text("description"),
  metadata: jsonb("metadata").default({}),
  actorUserId: integer("actor_user_id").references(() => usersTable.id),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: integer("related_entity_id"),
  isSystemGenerated: boolean("is_system_generated").default(true),
  caseStageId: integer("case_stage_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type CaseEvent = typeof caseEventsTable.$inferSelect;
export type InsertCaseEvent = typeof caseEventsTable.$inferInsert;
