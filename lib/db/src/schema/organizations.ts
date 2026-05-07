import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id"),
  subscriptionPlan: text("subscription_plan").notNull().default("solo"),
  subscriptionStatus: text("subscription_status").notNull().default("trial"),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  trialStartDate: timestamp("trial_start_date").defaultNow().notNull(),
  trialEndDate: timestamp("trial_end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Organization = typeof organizationsTable.$inferSelect;
