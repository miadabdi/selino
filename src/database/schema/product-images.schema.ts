import {
  AnyPgColumn,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { files } from "./files.schema";
import { products } from "./products.schema";

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  productId: integer("product_id")
    .notNull()
    .references((): AnyPgColumn => products.id, { onDelete: "cascade" }),
  fileId: integer("file_id")
    .notNull()
    .references((): AnyPgColumn => files.id, { onDelete: "cascade" }),

  position: integer("position").notNull().default(0),
  alt: varchar("alt", { length: 255 }),
});

export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
