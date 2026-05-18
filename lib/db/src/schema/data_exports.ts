import { pgTable, text, serial, integer, bigint, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const dataExportsTable = pgTable("data_exports", {
  id: serial("id").primaryKey(),
  requestedBy: integer("requested_by").references(() => usersTable.id).notNull(),
  exportType: text("export_type").notNull(), // 'full_cabinet' | 'single_client' | 'single_case'
  scopeId: integer("scope_id"),
  status: text("status").default("pending").notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  filePath: text("file_path"),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  downloadToken: text("download_token"),
  downloadExpiresAt: timestamp("download_expires_at"),
  downloadCount: integer("download_count").default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DataExport = typeof dataExportsTable.$inferSelect;
export type InsertDataExport = typeof dataExportsTable.$inferInsert;
