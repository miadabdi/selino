import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import { authOtps, type AuthOtp } from "../database/schema/index";

@Injectable()
export class OtpRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async createPhoneOtp(
    phone: string,
    code: string,
    expiresAt: Date,
    userId?: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext.insert(authOtps).values({
      phone,
      email: null,
      code,
      expiresAt,
      userId: userId ?? null,
      consumed: false,
    });
  }

  async createEmailOtp(
    email: string,
    code: string,
    expiresAt: Date,
    userId?: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext.insert(authOtps).values({
      phone: null,
      email,
      code,
      expiresAt,
      userId: userId ?? null,
      consumed: false,
    });
  }

  findValidPhoneOtp(
    phone: string,
    code: string,
    now: Date,
    txContext: TXContext = this.db,
  ): Promise<AuthOtp | undefined> {
    return txContext.query.authOtps.findFirst({
      where: (table) =>
        and(
          eq(table.phone, phone),
          eq(table.code, code),
          eq(table.consumed, false),
          gt(table.expiresAt, now),
        ),
    });
  }

  findValidEmailOtp(
    email: string,
    code: string,
    now: Date,
    txContext: TXContext = this.db,
  ): Promise<AuthOtp | undefined> {
    return txContext.query.authOtps.findFirst({
      where: (table) =>
        and(
          eq(table.email, email),
          eq(table.code, code),
          eq(table.consumed, false),
          gt(table.expiresAt, now),
        ),
    });
  }

  async markConsumed(
    otpId: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(authOtps)
      .set({ consumed: true })
      .where(eq(authOtps.id, otpId));
  }
}
