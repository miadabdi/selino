import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { TXContext } from "../database/database.types";
import type { NotificationCategoryPreferences } from "../database/schema/index.js";
import type { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto.js";
import type { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto.js";
import type { SendNotificationOptions } from "./interfaces/send-notification.interface";
import { DeliveryStatus } from "./notification.enums";
import { NotificationProducer } from "./notification.producer";
import { NotificationRepository } from "./notification.repository";

const DEFAULT_NOTIFICATION_PREFERENCES = {
  inAppEnabled: true,
  emailEnabled: true,
  smsEnabled: true,
  pushEnabled: false,
  categories: {} satisfies NotificationCategoryPreferences,
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly producer: NotificationProducer,
  ) {}

  /**
   * Queue a notification for delivery through the specified channel.
   *
   * - Persists DB records (notification + pending delivery) when `userId` is provided.
   * - Publishes a job to RabbitMQ; the consumer handles the actual dispatch
   *   via the channel handler (strategy pattern).
   */
  async send(
    options: SendNotificationOptions,
    txContext: TXContext = this.notificationRepository.db,
  ): Promise<void> {
    const {
      channel,
      destination,
      body,
      title,
      type,
      userId,
      businessAccountId,
      metadata,
    } = options;

    let deliveryId: number | undefined;

    if (userId) {
      const createdNotificationId =
        await this.notificationRepository.createNotification(
          userId,
          type,
          title,
          body,
          txContext,
          businessAccountId,
        );

      deliveryId = await this.notificationRepository.createDelivery(
        createdNotificationId,
        channel,
        destination,
        DeliveryStatus.PENDING,
        txContext,
      );
    }

    await this.producer.publish({
      deliveryId,
      channel,
      destination,
      body,
      title,
      type,
      metadata,
    });

    this.logger.debug(`Notification queued via ${channel} → ${destination}`);
  }

  list(user: AuthenticatedUser, query: ListNotificationsQueryDto) {
    this.assertOptionalBusinessMembership(user, query.businessAccountId);
    return this.notificationRepository.listForUser(user.id, query);
  }

  async getUnreadCount(user: AuthenticatedUser, businessAccountId?: number) {
    this.assertOptionalBusinessMembership(user, businessAccountId);
    return {
      count: await this.notificationRepository.countUnreadForUser(
        user.id,
        businessAccountId,
      ),
    };
  }

  async markRead(
    user: AuthenticatedUser,
    notificationId: number,
    businessAccountId?: number,
  ) {
    this.assertOptionalBusinessMembership(user, businessAccountId);
    const notification = await this.notificationRepository.findForUser(
      user.id,
      notificationId,
      businessAccountId,
    );
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (notification.businessAccountId != null) {
      this.assertBusinessMembership(user, notification.businessAccountId);
    }
    await this.notificationRepository.markRead(notificationId);
    return { message: "Notification marked as read" };
  }

  async markAllRead(user: AuthenticatedUser, businessAccountId?: number) {
    this.assertOptionalBusinessMembership(user, businessAccountId);
    const updated = await this.notificationRepository.transaction(
      async (tx) => {
        const unread = await this.notificationRepository.listUnreadIdsForUser(
          user.id,
          businessAccountId,
          tx,
        );
        for (const notification of unread) {
          await this.notificationRepository.markRead(notification.id, tx);
        }
        return unread.length;
      },
    );

    return { message: "Notifications marked as read", updated };
  }

  async getPreferences(user: AuthenticatedUser, businessAccountId: number) {
    this.assertBusinessMembership(user, businessAccountId);
    const preferences = await this.notificationRepository.findPreferences(
      user.id,
      businessAccountId,
    );

    return (
      preferences ?? {
        userId: user.id,
        businessAccountId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
      }
    );
  }

  async updatePreferences(
    user: AuthenticatedUser,
    businessAccountId: number,
    dto: UpdateNotificationPreferencesDto,
  ) {
    this.assertBusinessMembership(user, businessAccountId);
    const current = await this.notificationRepository.findPreferences(
      user.id,
      businessAccountId,
    );

    return this.notificationRepository.upsertPreferences(
      user.id,
      businessAccountId,
      {
        inAppEnabled:
          dto.inAppEnabled ??
          current?.inAppEnabled ??
          DEFAULT_NOTIFICATION_PREFERENCES.inAppEnabled,
        emailEnabled:
          dto.emailEnabled ??
          current?.emailEnabled ??
          DEFAULT_NOTIFICATION_PREFERENCES.emailEnabled,
        smsEnabled:
          dto.smsEnabled ??
          current?.smsEnabled ??
          DEFAULT_NOTIFICATION_PREFERENCES.smsEnabled,
        pushEnabled:
          dto.pushEnabled ??
          current?.pushEnabled ??
          DEFAULT_NOTIFICATION_PREFERENCES.pushEnabled,
        categories: {
          ...(current?.categories ??
            DEFAULT_NOTIFICATION_PREFERENCES.categories),
          ...dto.categories,
        },
      },
    );
  }

  private assertBusinessMembership(
    user: AuthenticatedUser,
    businessAccountId: number,
  ): void {
    if (
      user.isAdmin === true ||
      user.businessMemberships.some(
        (membership) =>
          membership.isActive &&
          membership.businessAccountId === businessAccountId,
      )
    ) {
      return;
    }

    throw new ForbiddenException(
      "You do not have access to this business account",
    );
  }

  private assertOptionalBusinessMembership(
    user: AuthenticatedUser,
    businessAccountId: number | undefined,
  ): void {
    if (businessAccountId != null) {
      this.assertBusinessMembership(user, businessAccountId);
    }
  }
}
