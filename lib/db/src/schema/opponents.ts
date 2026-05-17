import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const opponentsTable = pgTable("opponents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  lawyerName: text("lawyer_name"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  caseId: integer("case_id").references(() => casesTable.id),
  capacity: text("capacity"),
  opponentLawyerPhone: text("opponent_lawyer_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOpponentSchema = createInsertSchema(opponentsTable).omit({ id: true, createdAt: true });
export type InsertOpponent = z.infer<typeof insertOpponentSchema>;
export type Opponent = typeof opponentsTable.$inferSelect;
