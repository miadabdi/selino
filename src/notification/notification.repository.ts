import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database, DBContext } from "../database/database.types.js";
import {
  notificationDeliveries,
  notifications,
} from "../database/schema/index.js";
import type {
  DeliveryStatus,
  NotificationChannel,
} from "./notification.enums.js";

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
    db: DBContext = this.db,
  ): Promise<number> {
    const [notification] = await db
      .insert(notifications)
      .values({ userId, type, title, body })
      .returning();

    return notification.id;
  }

  async createDelivery(
    notificationId: number,
    channel: NotificationChannel,
    destination: string,
    status: DeliveryStatus,
    db: DBContext = this.db,
  ): Promise<number> {
    const [delivery] = await db
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
    db: DBContext = this.db,
  ): Promise<void> {
    await db
      .update(notificationDeliveries)
      .set({
        status,
        error,
      })
      .where(eq(notificationDeliveries.id, deliveryId));
  }
}
