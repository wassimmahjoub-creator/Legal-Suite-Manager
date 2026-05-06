import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const caseRelationsTable = pgTable("case_relations", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id).notNull(),
  relatedCaseId: integer("related_case_id").references(() => casesTable.id).notNull(),
  relationType: text("relation_type").notNull().default("مرتبطة"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCaseRelationSchema = createInsertSchema(caseRelationsTable).omit({ id: true, createdAt: true });
export type InsertCaseRelation = z.infer<typeof insertCaseRelationSchema>;
export type CaseRelation = typeof caseRelationsTable.$inferSelect;
