import {
  AnyPgColumn,
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const refreshTokenRevokedReasonEnum = pgEnum(
  "refresh_token_revoked_reason",
  ["logout", "rotate", "admin_revoke", "logout_all", "suspected_reuse"],
);

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),

  userId: integer("user_id")
    .notNull()
    .references((): AnyPgColumn => users.id, { onDelete: "cascade" }),

  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  jti: varchar("jti", { length: 255 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),

  isRevoked: boolean("is_revoked").notNull().default(false),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedReason: refreshTokenRevokedReasonEnum("revoked_reason"),

  replacedBy: integer("replaced_by"),
  rotationCount: integer("rotation_count").notNull().default(0),
});

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
