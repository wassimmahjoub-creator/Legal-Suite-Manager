import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const confidentialNotesTable = pgTable("confidential_notes", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id).notNull(),
  content: text("content").notNull(),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConfidentialNoteSchema = createInsertSchema(confidentialNotesTable).omit({ id: true, createdAt: true });
export type InsertConfidentialNote = z.infer<typeof insertConfidentialNoteSchema>;
export type ConfidentialNote = typeof confidentialNotesTable.$inferSelect;
