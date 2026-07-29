import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  notificationDeliveries,
  notificationPreferences,
  notifications,
  type NotificationCategoryPreferences,
} from "../database/schema/index";
import type { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto.js";
import type { DeliveryStatus, NotificationChannel } from "./notification.enums";

@Injectable()
export class NotificationRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async createNotification(
    userId: number,
    type: string,
    title: string | undefined,
    body: string,
    txContext: TXContext = this.db,
    businessAccountId?: number,
  ): Promise<number> {
    const [notification] = await txContext
      .insert(notifications)
      .values({ userId, businessAccountId, type, title, body })
      .returning();

    return notification.id;
  }

  async createDelivery(
    notificationId: number,
    channel: NotificationChannel,
    destination: string,
    status: DeliveryStatus,
    txContext: TXContext = this.db,
  ): Promise<number> {
    const [delivery] = await txContext
      .insert(notificationDeliveries)
      .values({
        notificationId,
        channel,
        destination,
        status,
      })
      .returning();

    return delivery.id;
  }

  async updateDelivery(
    deliveryId: number,
    status: DeliveryStatus,
    error: string | null,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(notificationDeliveries)
      .set({
        status,
        error,
      })
      .where(eq(notificationDeliveries.id, deliveryId));
  }

  async listForUser(
    userId: number,
    query: ListNotificationsQueryDto,
    txContext: TXContext = this.db,
  ) {
    const where = and(
      eq(notifications.userId, userId),
      query.businessAccountId == null
        ? undefined
        : eq(notifications.businessAccountId, query.businessAccountId),
      query.unreadOnly ? isNull(notifications.readAt) : undefined,
    );
    const offset = (query.page - 1) * query.limit;

    const [items, totalRows] = await Promise.all([
      txContext
        .select({
          id: notifications.id,
          createdAt: notifications.createdAt,
          businessAccountId: notifications.businessAccountId,
          type: notifications.type,
          title: notifications.title,
          body: notifications.body,
          payload: notifications.payload,
          readAt: notifications.readAt,
          isRead: sql<boolean>`${notifications.readAt} is not null`,
        })
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(query.limit)
        .offset(offset),
      txContext.select({ value: count() }).from(notifications).where(where),
    ]);

    const total = totalRows[0]?.value ?? 0;
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async countUnreadForUser(
    userId: number,
    businessAccountId: number | undefined,
    txContext: TXContext = this.db,
  ): Promise<number> {
    const [result] = await txContext
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          businessAccountId == null
            ? undefined
            : eq(notifications.businessAccountId, businessAccountId),
          isNull(notifications.readAt),
        ),
      );

    return result?.value ?? 0;
  }

  findForUser(
    userId: number,
    notificationId: number,
    businessAccountId: number | undefined,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.notifications.findFirst({
      where: (table) =>
        and(
          eq(table.id, notificationId),
          eq(table.userId, userId),
          businessAccountId == null
            ? undefined
            : eq(table.businessAccountId, businessAccountId),
        ),
    });
  }

  listUnreadIdsForUser(
    userId: number,
    businessAccountId: number | undefined,
    txContext: TXContext = this.db,
  ): Promise<Array<{ id: number }>> {
    return txContext
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          businessAccountId == null
            ? undefined
            : eq(notifications.businessAccountId, businessAccountId),
          isNull(notifications.readAt),
        ),
      );
  }

  async markRead(
    notificationId: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.id, notificationId), isNull(notifications.readAt)),
      );
  }

  findPreferences(
    userId: number,
    businessAccountId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.notificationPreferences.findFirst({
      where: (table) =>
        and(
          eq(table.userId, userId),
          eq(table.businessAccountId, businessAccountId),
        ),
    });
  }

  async upsertPreferences(
    userId: number,
    businessAccountId: number,
    data: {
      inAppEnabled: boolean;
      emailEnabled: boolean;
      smsEnabled: boolean;
      pushEnabled: boolean;
      categories: NotificationCategoryPreferences;
    },
    txContext: TXContext = this.db,
  ) {
    const [preferences] = await txContext
      .insert(notificationPreferences)
      .values({ userId, businessAccountId, ...data })
      .onConflictDoUpdate({
        target: [
          notificationPreferences.userId,
          notificationPreferences.businessAccountId,
        ],
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning();

    return preferences;
  }
}
