import { pgTable, text, serial, boolean, integer } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";

export const clientContactsTable = pgTable("client_contacts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").default(""),
  role: text("role"),
  phone: text("phone"),
  email: text("email"),
  isPrimary: boolean("is_primary").default(false),
});

export type ClientContact = typeof clientContactsTable.$inferSelect;
export type InsertClientContact = typeof clientContactsTable.$inferInsert;
