import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { stores } from "./stores.schema";
import { users } from "./users.schema";

export const storeMemberRoleEnum = pgEnum("store_member_role", [
  "owner",
  "manager",
  "seller",
  "gatherer",
]);

export const storeMembers = pgTable(
  "store_members",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: storeMemberRoleEnum("role"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("store_members_store_id_user_id_unique").on(
      table.storeId,
      table.userId,
    ),
  ],
);

export type StoreMember = typeof storeMembers.$inferSelect;
export type NewStoreMember = typeof storeMembers.$inferInsert;
