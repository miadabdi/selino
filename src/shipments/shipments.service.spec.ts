import type { AuthenticatedUser } from "../auth/interfaces/index";
import { ShipmentsRepository } from "./shipments.repository";
import { ShipmentsService } from "./shipments.service";

const user = {
  id: 10,
  isAdmin: false,
  permissions: ["manager.orders.track"],
  businessMemberships: [
    {
      id: 1,
      businessAccountId: 100,
      businessName: "فروشگاه نمونه",
      role: "manager",
      permissions: ["manager.orders.track"],
      isActive: true,
    },
  ],
} as AuthenticatedUser;

describe("ShipmentsService", () => {
  const tx = {};
  const repository = {
    transaction: jest.fn((callback) => callback(tx)),
    findOrderForBusiness: jest.fn(),
    create: jest.fn(),
    findForBusinessForUpdate: jest.fn(),
    synchronizeOrderStatus: jest.fn(),
    update: jest.fn(),
    findForBusiness: jest.fn(),
    recordLocation: jest.fn(),
  };
  const service = new ShipmentsService(
    repository as unknown as ShipmentsRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it("creates a shipment only when the order is ready", async () => {
    repository.findOrderForBusiness.mockResolvedValue({
      id: 4,
      status: "processing",
    });
    await expect(
      service.create(100, user, {
        orderId: 4,
        carrier: "پست",
        trackingCode: "TRACK-1",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("synchronizes dispatch with the parent order atomically", async () => {
    repository.findForBusinessForUpdate.mockResolvedValue({
      id: 6,
      orderId: 4,
      status: "ready_for_pickup",
    });
    repository.synchronizeOrderStatus.mockResolvedValue({
      id: 4,
      status: "shipped",
    });
    repository.update.mockResolvedValue({ id: 6, status: "in_transit" });

    await expect(
      service.update(100, 6, user, { status: "in_transit" }),
    ).resolves.toMatchObject({ status: "in_transit" });
    expect(repository.synchronizeOrderStatus).toHaveBeenCalledWith(
      4,
      "shipped",
      10,
      undefined,
      tx,
    );
    expect(repository.update).toHaveBeenCalledWith(
      6,
      { status: "in_transit" },
      tx,
    );
  });

  it("rejects invalid shipment lifecycle transitions", async () => {
    repository.findForBusinessForUpdate.mockResolvedValue({
      id: 6,
      orderId: 4,
      status: "pending",
    });
    await expect(
      service.update(100, 6, user, { status: "delivered" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("does not record locations after delivery", async () => {
    repository.findForBusiness.mockResolvedValue({
      id: 6,
      status: "delivered",
    });
    await expect(
      service.recordLocation(100, 6, user, {
        latitude: 35.7,
        longitude: 51.4,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.recordLocation).not.toHaveBeenCalled();
  });
});
