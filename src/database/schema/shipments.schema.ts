import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
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
import { businessAddresses } from "./business-addresses.schema";
import { orders } from "./orders.schema";
import { users } from "./users.schema";

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "pending",
  "ready_for_pickup",
  "in_transit",
  "delayed",
  "delivered",
  "failed",
  "cancelled",
]);

export const shipments = pgTable(
  "shipments",
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

    orderId: integer("order_id")
      .notNull()
      .references((): AnyPgColumn => orders.id, { onDelete: "restrict" }),
    originAddressId: integer("origin_address_id").references(
      (): AnyPgColumn => businessAddresses.id,
      { onDelete: "set null" },
    ),
    destinationAddressId: integer("destination_address_id").references(
      (): AnyPgColumn => businessAddresses.id,
      { onDelete: "set null" },
    ),
    trackingNumber: varchar("tracking_number", { length: 100 }),
    carrier: varchar("carrier", { length: 255 }),
    status: shipmentStatusEnum("status").notNull().default("pending"),
    estimatedDeliveryAt: timestamp("estimated_delivery_at", {
      withTimezone: true,
    }),
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    delayedAt: timestamp("delayed_at", { withTimezone: true }),
    delayReason: text("delay_reason"),
    currentLatitude: numeric("current_latitude", {
      precision: 9,
      scale: 6,
      mode: "number",
    }),
    currentLongitude: numeric("current_longitude", {
      precision: 9,
      scale: 6,
      mode: "number",
    }),
    lastLocationAt: timestamp("last_location_at", { withTimezone: true }),
    notes: text("notes"),
    createdBy: integer("created_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("shipments_order_status_idx").on(table.orderId, table.status),
    index("shipments_status_estimated_delivery_idx").on(
      table.status,
      table.estimatedDeliveryAt,
    ),
    uniqueIndex("shipments_active_tracking_number_unique")
      .on(table.trackingNumber)
      .where(
        sql`${table.deletedAt} is null and ${table.trackingNumber} is not null`,
      ),
    check(
      "shipments_current_latitude_check",
      sql`${table.currentLatitude} is null or (${table.currentLatitude} >= -90 and ${table.currentLatitude} <= 90)`,
    ),
    check(
      "shipments_current_longitude_check",
      sql`${table.currentLongitude} is null or (${table.currentLongitude} >= -180 and ${table.currentLongitude} <= 180)`,
    ),
    check(
      "shipments_current_coordinate_pair_check",
      sql`(${table.currentLatitude} is null and ${table.currentLongitude} is null) or (${table.currentLatitude} is not null and ${table.currentLongitude} is not null)`,
    ),
  ],
);

export type Shipment = typeof shipments.$inferSelect;
export type NewShipment = typeof shipments.$inferInsert;
