import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { businessAccounts } from "./business-accounts.schema";
import { users } from "./users.schema";

export const businessAddressTypeEnum = pgEnum("business_address_type", [
  "headquarters",
  "billing",
  "shipping",
  "warehouse",
  "other",
]);

export const businessAddresses = pgTable(
  "business_addresses",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    businessAccountId: integer("business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id, {
        onDelete: "cascade",
      }),
    type: businessAddressTypeEnum("type").notNull().default("other"),
    label: varchar("label", { length: 100 }),
    recipientName: varchar("recipient_name", { length: 255 }),
    phone: varchar("phone", { length: 30 }),
    countryCode: varchar("country_code", { length: 2 }).notNull().default("IR"),
    province: varchar("province", { length: 100 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    addressLine: text("address_line").notNull(),
    postalCode: varchar("postal_code", { length: 20 }),
    latitude: numeric("latitude", {
      precision: 9,
      scale: 6,
      mode: "number",
    }),
    longitude: numeric("longitude", {
      precision: 9,
      scale: 6,
      mode: "number",
    }),
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: integer("created_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    updatedBy: integer("updated_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("business_addresses_account_idx").on(table.businessAccountId),
    index("business_addresses_account_type_idx").on(
      table.businessAccountId,
      table.type,
    ),
    uniqueIndex("business_addresses_default_account_unique")
      .on(table.businessAccountId)
      .where(sql`${table.deletedAt} is null and ${table.isDefault} = true`),
    check(
      "business_addresses_latitude_check",
      sql`${table.latitude} is null or (${table.latitude} >= -90 and ${table.latitude} <= 90)`,
    ),
    check(
      "business_addresses_longitude_check",
      sql`${table.longitude} is null or (${table.longitude} >= -180 and ${table.longitude} <= 180)`,
    ),
    check(
      "business_addresses_coordinate_pair_check",
      sql`(${table.latitude} is null and ${table.longitude} is null) or (${table.latitude} is not null and ${table.longitude} is not null)`,
    ),
  ],
);

export type BusinessAddress = typeof businessAddresses.$inferSelect;
export type NewBusinessAddress = typeof businessAddresses.$inferInsert;
