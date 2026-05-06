import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const legalConfigItemsTable = pgTable("legal_config_items", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLegalConfigItemSchema = createInsertSchema(legalConfigItemsTable).omit({ id: true, createdAt: true });
export type InsertLegalConfigItem = z.infer<typeof insertLegalConfigItemSchema>;
export type LegalConfigItem = typeof legalConfigItemsTable.$inferSelect;
