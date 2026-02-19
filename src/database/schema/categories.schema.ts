import {
  boolean,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export type CategorySpecSchema = Record<
  string,
  {
    type: "string" | "number" | "enum";
    required: boolean;
    label: string;
    unit?: string;
    options?: string[];
  }
>;

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  parentId: integer("parent_id").references(() => categories.id, {
    onDelete: "set null",
  }),

  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 255 }),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),

  specSchema: json("spec_schema")
    .$type<CategorySpecSchema>()
    .notNull()
    .default({}),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
