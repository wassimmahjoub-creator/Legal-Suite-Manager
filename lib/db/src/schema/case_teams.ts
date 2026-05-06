import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";
import { usersTable } from "./users";

export const caseTeamsTable = pgTable("case_teams", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id).notNull(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  role: text("role").notNull().default("مساعد"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCaseTeamSchema = createInsertSchema(caseTeamsTable).omit({ id: true, createdAt: true });
export type InsertCaseTeam = z.infer<typeof insertCaseTeamSchema>;
export type CaseTeam = typeof caseTeamsTable.$inferSelect;
