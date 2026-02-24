import {
  AnyPgColumn,
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

export enum StoreMemberRole {
  Owner = "owner",
  Manager = "manager",
  Seller = "seller",
  Gatherer = "gatherer",
}

export const storeMemberRoleEnum = pgEnum(
  "store_member_role",
  Object.values(StoreMemberRole) as [StoreMemberRole, ...StoreMemberRole[]],
);

export const MANAGING_STORE_MEMBER_ROLES: readonly StoreMemberRole[] = [
  StoreMemberRole.Owner,
  StoreMemberRole.Manager,
  StoreMemberRole.Seller,
];

export const storeMembers = pgTable(
  "store_members",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references((): AnyPgColumn => stores.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: "cascade" }),
    role: storeMemberRoleEnum("role").notNull(),
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
