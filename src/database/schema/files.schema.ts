import {
  AnyPgColumn,
  bigint,
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const fileStatusEnum = pgEnum("file_status", [
  "pending",
  "ready",
  "failed",
]);

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  bucketName: varchar("bucket_name", { length: 255 }).notNull(),
  path: varchar("path", { length: 512 }).notNull(),
  filename: varchar("filename", { length: 512 }).notNull(),
  mimetype: varchar("mimetype", { length: 255 }),
  sizeInBytes: bigint("size_in_bytes", { mode: "number" }),
  checksum: varchar("checksum", { length: 255 }),
  isPublic: boolean("is_public").notNull().default(false),
  status: fileStatusEnum("status").notNull().default("pending"),

  uploadedBy: integer("uploaded_by").references((): AnyPgColumn => users.id),
});

export type FileRecord = typeof files.$inferSelect;
export type NewFileRecord = typeof files.$inferInsert;
