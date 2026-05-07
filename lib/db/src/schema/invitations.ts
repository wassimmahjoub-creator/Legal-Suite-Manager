import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const invitationsTable = pgTable("invitations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("lawyer"),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  invitedBy: integer("invited_by").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Invitation = typeof invitationsTable.$inferSelect;
