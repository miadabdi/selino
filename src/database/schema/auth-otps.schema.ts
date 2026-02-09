import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const authOtps = pgTable("auth_otps", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  consumed: boolean("consumed").notNull().default(false),
});

export type AuthOtp = typeof authOtps.$inferSelect;
export type NewAuthOtp = typeof authOtps.$inferInsert;
