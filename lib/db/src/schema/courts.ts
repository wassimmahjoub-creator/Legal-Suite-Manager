import { pgTable, text, serial, timestamp, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const courtTypeEnum = pgEnum("court_type", [
  "cassation",
  "appel",
  "premiere_instance",
  "cantonal",
  "administratif",
  "immobilier",
  "prudhommes",
  "autre",
]);

export type Chamber = { id: string; nameAr: string; nameFr: string; specialty: string };

export const courtsTable = pgTable("courts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  nameFr: text("name_fr"),
  type: courtTypeEnum("type").default("premiere_instance"),
  parentCourtId: integer("parent_court_id"),
  governorate: text("governorate"),
  division: text("division"),
  city: text("city"),
  address: text("address"),
  phone: text("phone"),
  notes: text("notes"),
  chambers: jsonb("chambers").$type<Chamber[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCourtSchema = createInsertSchema(courtsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCourt = z.infer<typeof insertCourtSchema>;
export type Court = typeof courtsTable.$inferSelect;
