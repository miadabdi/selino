import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, DBContext } from "../database/database.types";
import {
  refreshTokens,
  type NewRefreshToken,
  type RefreshToken,
} from "../database/schema/index";

@Injectable()
export class RefreshTokenRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async create(
    data: NewRefreshToken,
    db: DBContext = this.db,
  ): Promise<RefreshToken> {
    const [created] = await db.insert(refreshTokens).values(data).returning();
    return created;
  }

  findByTokenHash(
    tokenHash: string,
    db: DBContext = this.db,
  ): Promise<RefreshToken | undefined> {
    return db.query.refreshTokens.findFirst({
      where: (table) => eq(table.tokenHash, tokenHash),
    });
  }

  async markRevokedForRotation(
    tokenId: number,
    replacedBy: number,
    db: DBContext = this.db,
  ): Promise<void> {
    await db
      .update(refreshTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "rotate",
        replacedBy,
        lastUsedAt: new Date(),
      })
      .where(eq(refreshTokens.id, tokenId));
  }

  async revokeByHash(
    tokenHash: string,
    reason: NonNullable<NewRefreshToken["revokedReason"]>,
    db: DBContext = this.db,
  ): Promise<void> {
    await db
      .update(refreshTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.isRevoked, false),
        ),
      );
  }

  async revokeAllForUser(
    userId: number,
    reason: NonNullable<NewRefreshToken["revokedReason"]>,
    db: DBContext = this.db,
  ): Promise<void> {
    await db
      .update(refreshTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.isRevoked, false),
        ),
      );
  }
}
