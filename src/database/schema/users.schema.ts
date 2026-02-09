import {
  boolean,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  phone: varchar("phone", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 255 }).unique(),

  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),

  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

  isPhoneVerified: boolean("is_phone_verified").notNull().default(false),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
