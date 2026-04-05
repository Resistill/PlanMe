import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  content: text("content").notNull().default(""),
  metadata: text("metadata").notNull().default("{}"),
  revision: integer("revision").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const revisionHistory = sqliteTable("revision_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id),
  revision: integer("revision").notNull(),
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull(),
  deviceId: text("device_id").notNull(),
});

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at"),
});
