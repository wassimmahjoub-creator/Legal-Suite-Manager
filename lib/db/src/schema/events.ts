import { pgTable, text, serial, integer, timestamp, date, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";
import { organizationsTable } from "./organizations";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizationsTable.id).notNull(),
  title: text("title").notNull(),
  caseId: integer("case_id").references(() => casesTable.id),
  date: date("date").notNull(),
  time: text("time"),
  location: text("location"),
  court: text("court"),
  division: text("division"),
  type: text("type").notNull().default("other"),
  objective: text("objective"),
  result: text("result"),
  legalStatus: text("legal_status"),
  postponedTo: date("postponed_to"),
  notes: text("notes"),
  duration: integer("duration").default(60),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgDateIdx: index("events_org_date_idx").on(table.orgId, table.date),
}));

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type CalendarEvent = typeof eventsTable.$inferSelect;
