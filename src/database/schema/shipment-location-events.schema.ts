import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  check,
  index,
  integer,
  json,
  numeric,
  pgEnum,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { shipments, shipmentStatusEnum } from "./shipments.schema";
import { users } from "./users.schema";

export const shipmentLocationSourceEnum = pgEnum("shipment_location_source", [
  "manual",
  "gps",
  "carrier",
  "system",
]);

export const shipmentLocationEvents = pgTable(
  "shipment_location_events",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    shipmentId: integer("shipment_id")
      .notNull()
      .references((): AnyPgColumn => shipments.id, { onDelete: "cascade" }),
    latitude: numeric("latitude", {
      precision: 9,
      scale: 6,
      mode: "number",
    }).notNull(),
    longitude: numeric("longitude", {
      precision: 9,
      scale: 6,
      mode: "number",
    }).notNull(),
    accuracyMeters: numeric("accuracy_meters", {
      precision: 10,
      scale: 2,
      mode: "number",
    }),
    status: shipmentStatusEnum("status"),
    source: shipmentLocationSourceEnum("source").notNull().default("manual"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    recordedBy: integer("recorded_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("shipment_location_events_shipment_recorded_idx").on(
      table.shipmentId,
      table.recordedAt,
    ),
    check(
      "shipment_location_events_latitude_check",
      sql`${table.latitude} >= -90 and ${table.latitude} <= 90`,
    ),
    check(
      "shipment_location_events_longitude_check",
      sql`${table.longitude} >= -180 and ${table.longitude} <= 180`,
    ),
    check(
      "shipment_location_events_accuracy_check",
      sql`${table.accuracyMeters} is null or ${table.accuracyMeters} >= 0`,
    ),
  ],
);

export type ShipmentLocationEvent = typeof shipmentLocationEvents.$inferSelect;
export type NewShipmentLocationEvent =
  typeof shipmentLocationEvents.$inferInsert;
