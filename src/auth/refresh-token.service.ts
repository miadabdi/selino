import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import {
  refreshTokens,
  type NewRefreshToken,
  type RefreshToken,
} from "../database/schema/index.js";

type RefreshTokenRevokedReason = NonNullable<NewRefreshToken["revokedReason"]>;

@Injectable()
export class RefreshTokenService {
  private readonly refreshTtlDays: number;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
    this.refreshTtlDays = parseInt(
      this.configService.get<string>("REFRESH_TOKEN_EXPIRES_IN_DAYS", "30"),
      10,
    );
  }

  /**
   * Generate a cryptographically random refresh token string.
   */
  generateRawToken(): string {
    return randomBytes(48).toString("base64url");
  }

  /**
   * Hash a raw token with SHA-256 (we never store the raw token).
   */
  hashToken(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  /**
   * Create and persist a new refresh token for a user.
   * Returns the raw (unhashed) token to send to the client.
   */
  async create(userId: number, jti?: string): Promise<string> {
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000,
    );

    await this.db.insert(refreshTokens).values({
      userId,
      tokenHash,
      jti: jti ?? null,
      expiresAt,
    });

    return rawToken;
  }

  /**
   * Validate and consume a refresh token (rotation).
   * Revokes the old token, creates a new one, and returns the new raw token + the token record.
   */
  async rotate(
    rawToken: string,
  ): Promise<{ newRawToken: string; tokenRecord: RefreshToken }> {
    const tokenHash = this.hashToken(rawToken);

    const existing = await this.db.query.refreshTokens.findFirst({
      where: (table) => eq(table.tokenHash, tokenHash),
    });

    if (!existing) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (existing.isRevoked) {
      // Possible token reuse attack — revoke entire family
      await this.revokeAllForUser(existing.userId, "suspected_reuse");
      throw new UnauthorizedException(
        "Refresh token has been revoked (possible reuse detected)",
      );
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token has expired");
    }

    // Create replacement token
    const newRawToken = this.generateRawToken();
    const newTokenHash = this.hashToken(newRawToken);
    const expiresAt = new Date(
      Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000,
    );

    const [newRecord] = await this.db
      .insert(refreshTokens)
      .values({
        userId: existing.userId,
        tokenHash: newTokenHash,
        expiresAt,
        rotationCount: existing.rotationCount + 1,
      })
      .returning();

    // Revoke old token and link to replacement
    await this.db
      .update(refreshTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "rotate",
        replacedBy: newRecord.id,
        lastUsedAt: new Date(),
      })
      .where(eq(refreshTokens.id, existing.id));

    return { newRawToken, tokenRecord: newRecord };
  }

  /**
   * Revoke a single refresh token by raw value.
   */
  async revoke(
    rawToken: string,
    reason: RefreshTokenRevokedReason = "logout",
  ): Promise<void> {
    const tokenHash = this.hashToken(rawToken);

    await this.db
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

  /**
   * Revoke all refresh tokens for a user.
   */
  async revokeAllForUser(
    userId: number,
    reason: RefreshTokenRevokedReason = "logout_all",
  ): Promise<void> {
    await this.db
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
