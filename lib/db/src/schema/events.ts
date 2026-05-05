import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  caseId: integer("case_id").references(() => casesTable.id),
  date: date("date").notNull(),
  time: text("time"),
  location: text("location"),
  type: text("type").notNull().default("other"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type CalendarEvent = typeof eventsTable.$inferSelect;
