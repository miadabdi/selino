import { OrdersRepository } from "./orders.repository";

describe("OrdersRepository lifecycle synchronization", () => {
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
