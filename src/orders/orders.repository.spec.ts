import { OrdersRepository } from "./orders.repository";

describe("OrdersRepository lifecycle synchronization", () => {
  it("lists real party, item, delivery, and shipment data", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 1,
        buyerBusinessAccount: { id: 10, name: "خریدار", logoFileId: null },
        supplierBusinessAccount: {
          id: 20,
          name: "تامین کننده",
          logoFileId: null,
        },
        invoice: {
          id: 30,
          invoiceNumber: "INV-30",
          items: [{ qty: 2 }, { qty: 3 }],
        },
        shippingAddress: { city: "تهران" },
        shipments: [
          {
            id: 40,
            status: "in_transit",
            currentLatitude: 35.7,
            currentLongitude: 51.4,
            estimatedDeliveryAt: new Date("2026-08-02T00:00:00.000Z"),
            delayReason: null,
          },
        ],
      },
    ]);
    const where = jest.fn().mockResolvedValue([{ total: 1 }]);
    const select = jest.fn(() => ({
      from: () => ({ where }),
    }));
    const repository = new OrdersRepository({
      query: { orders: { findMany } },
      select,
    } as never);

    const result = await repository.listForBusiness(10, {
      page: 1,
      limit: 20,
    });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        buyerName: "خریدار",
        supplierName: "تامین کننده",
        invoiceNumber: "INV-30",
        itemCount: 2,
        quantity: 5,
        shipmentId: 40,
        shipmentStatus: "in_transit",
        currentLatitude: 35.7,
      }),
    );
  });

  it("advances an invoice through sent and delivered for a delivered order", async () => {
    const forUpdate = jest
      .fn()
      .mockResolvedValueOnce([{ id: 8, status: "pending" }])
      .mockResolvedValueOnce([{ id: 8, status: "sent" }]);
    const select = jest.fn(() => ({
      from: () => ({
        where: () => ({ for: forUpdate }),
      }),
    }));
    const returning = jest
      .fn()
      .mockResolvedValueOnce([{ id: 8, status: "sent" }])
      .mockResolvedValueOnce([{ id: 8, status: "delivered" }]);
    const update = jest.fn(() => ({
      set: () => ({
        where: () => ({ returning }),
      }),
    }));
    const values = jest.fn().mockResolvedValue(undefined);
    const insert = jest.fn(() => ({ values }));
    const repository = new OrdersRepository({} as never);

    await repository.synchronizeInvoiceForOrder(
      8,
      "delivered",
      10,
      "Shipment delivered",
      { select, update, insert } as never,
    );

    expect(update).toHaveBeenCalledTimes(2);
    expect(values).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        invoiceId: 8,
        previousStatus: "pending",
        status: "sent",
      }),
    );
    expect(values).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        invoiceId: 8,
        previousStatus: "sent",
        status: "delivered",
      }),
    );
  });

  it("does not overwrite a paid invoice with shipment state", async () => {
    const select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          for: jest.fn().mockResolvedValue([{ id: 8, status: "paid" }]),
        }),
      }),
    }));
    const update = jest.fn();
    const insert = jest.fn();
    const repository = new OrdersRepository({} as never);

    await repository.synchronizeInvoiceForOrder(8, "delivered", 10, undefined, {
      select,
      update,
      insert,
    } as never);

    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
