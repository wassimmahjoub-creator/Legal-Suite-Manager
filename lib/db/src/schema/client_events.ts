import { pgTable, serial, integer, text, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";

export const clientEventTypeEnum = pgEnum("client_event_type", [
  "case_created",
  "invoice_issued",
  "payment_received",
  "document_signed",
  "message_sent",
  "note_added",
]);

export const clientEventsTable = pgTable("client_events", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  eventType: clientEventTypeEnum("event_type").notNull(),
  payload: jsonb("payload"),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  createdBy: text("created_by"),
});

export type ClientEvent = typeof clientEventsTable.$inferSelect;
export type InsertClientEvent = typeof clientEventsTable.$inferInsert;
