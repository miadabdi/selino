import {
  boolean,
  date,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { brands } from "./brands.schema";
import { categories } from "./categories.schema";
import { files } from "./files.schema";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  brandId: integer("brand_id").references(() => brands.id, {
    onDelete: "set null",
  }),

  title: varchar("title", { length: 255 }).notNull(),
  model: varchar("model", { length: 255 }),

  specs: json("specs").$type<Record<string, unknown>>().notNull(),
  attributes: json("attributes").$type<Record<string, unknown>>(),

  warrantyMonths: integer("warranty_months"),
  releaseDate: date("release_date"),
  weightGrams: integer("weight_grams"),
  dimensions: varchar("dimensions", { length: 255 }),

  searchText: text("search_text"),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  isActive: boolean("is_active").notNull().default(true),

  defaultImageFileId: integer("default_image_file_id").references(
    () => files.id,
    {
      onDelete: "set null",
    },
  ),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
