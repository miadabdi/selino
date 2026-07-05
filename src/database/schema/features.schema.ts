import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const features = pgTable("features", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Feature = typeof features.$inferSelect;
export type NewFeature = typeof features.$inferInsert;
