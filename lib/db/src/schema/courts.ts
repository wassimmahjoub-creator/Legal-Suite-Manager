import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const courtsTable = pgTable("courts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  division: text("division"),
  city: text("city"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCourtSchema = createInsertSchema(courtsTable).omit({ id: true, createdAt: true });
export type InsertCourt = z.infer<typeof insertCourtSchema>;
export type Court = typeof courtsTable.$inferSelect;
