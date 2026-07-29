import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { NotificationChannel } from "./notification.enums.js";
import { NotificationService } from "./notification.service.js";

const user = (businessAccountId = 20): AuthenticatedUser =>
  ({
    id: 7,
    isAdmin: false,
    permissions: [],
    businessMemberships: [
      {
        id: 1,
        businessAccountId,
        businessName: "Store",
        role: "seller",
        permissions: [],
        isActive: true,
      },
    ],
  }) as AuthenticatedUser;

describe("NotificationService inbox", () => {
  it("persists optional business context without breaking delivery", async () => {
    const repository = {
      db: {},
      createNotification: jest.fn().mockResolvedValue(11),
      createDelivery: jest.fn().mockResolvedValue(12),
    };
    const producer = { publish: jest.fn().mockResolvedValue(undefined) };
    const service = new NotificationService(
      repository as never,
      producer as never,
    );

    await service.send({
      userId: 7,
      businessAccountId: 20,
      channel: NotificationChannel.EMAIL,
      destination: "user@example.com",
      type: "invoice_created",
      title: "Invoice",
      body: "Created",
    });

    expect(repository.createNotification).toHaveBeenCalledWith(
      7,
      "invoice_created",
      "Invoice",
      "Created",
      {},
      20,
    );
    expect(producer.publish).toHaveBeenCalled();
  });

  it("rejects inbox filtering for an unrelated business", () => {
    const service = new NotificationService({} as never, {} as never);

    expect(() =>
      service.list(user(20), {
        page: 1,
        limit: 20,
        unreadOnly: false,
        businessAccountId: 99,
      }),
    ).toThrow(ForbiddenException);
  });

  it("does not mark another user's notification as read", async () => {
    const repository = {
      findForUser: jest.fn().mockResolvedValue(undefined),
      markRead: jest.fn(),
    };
    const service = new NotificationService(repository as never, {} as never);

    await expect(service.markRead(user(), 44, 20)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.markRead).not.toHaveBeenCalled();
  });

  it("marks all unread notifications in the selected business", async () => {
    const tx = {};
    const repository = {
      transaction: jest.fn((callback) => callback(tx)),
      listUnreadIdsForUser: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      markRead: jest.fn().mockResolvedValue(undefined),
    };
    const service = new NotificationService(repository as never, {} as never);

    await expect(service.markAllRead(user(), 20)).resolves.toEqual({
      message: "Notifications marked as read",
      updated: 2,
    });
    expect(repository.listUnreadIdsForUser).toHaveBeenCalledWith(7, 20, tx);
    expect(repository.markRead).toHaveBeenCalledTimes(2);
  });

  it("merges category preferences without resetting existing channels", async () => {
    const repository = {
      findPreferences: jest.fn().mockResolvedValue({
        inAppEnabled: true,
        emailEnabled: false,
        smsEnabled: true,
        pushEnabled: false,
        categories: { invoices: false, orders: true },
      }),
      upsertPreferences: jest
        .fn()
        .mockImplementation((_userId, _businessId, data) =>
          Promise.resolve(data),
        ),
    };
    const service = new NotificationService(repository as never, {} as never);

    await service.updatePreferences(user(), 20, {
      pushEnabled: true,
      categories: { invoices: true },
    });

    expect(repository.upsertPreferences).toHaveBeenCalledWith(7, 20, {
      inAppEnabled: true,
      emailEnabled: false,
      smsEnabled: true,
      pushEnabled: true,
      categories: { invoices: true, orders: true },
    });
  });
});
