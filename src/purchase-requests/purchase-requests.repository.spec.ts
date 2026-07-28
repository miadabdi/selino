import { PurchaseRequestsRepository } from "./purchase-requests.repository";

describe("PurchaseRequestsRepository invoice numbering", () => {
  it("retries when a generated invoice number conflicts", async () => {
    const invoice = {
      id: 1,
      invoiceNumber: "5831049276",
    };
    const returning = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([invoice]);
    const onConflictDoNothing = jest.fn(() => ({ returning }));
    const values = jest.fn(() => ({ onConflictDoNothing }));
    const insert = jest.fn(() => ({ values }));
    const repository = new PurchaseRequestsRepository({} as never);

    await expect(
      repository.createInvoice(
        {
          supplierBusinessAccountId: 200,
          buyerBusinessAccountId: 100,
          buyerId: 10,
          purchaseRequestId: 50,
          totalAmount: 100,
        },
        { insert } as never,
      ),
    ).resolves.toBe(invoice);

    expect(insert).toHaveBeenCalledTimes(2);
    expect(onConflictDoNothing).toHaveBeenCalledTimes(2);
    expect(returning).toHaveBeenCalledTimes(2);
  });

  it("fails after twenty consecutive number conflicts", async () => {
    const returning = jest.fn().mockResolvedValue([]);
    const onConflictDoNothing = jest.fn(() => ({ returning }));
    const values = jest.fn(() => ({ onConflictDoNothing }));
    const insert = jest.fn(() => ({ values }));
    const repository = new PurchaseRequestsRepository({} as never);

    await expect(
      repository.createInvoice(
        {
          supplierBusinessAccountId: 200,
          buyerBusinessAccountId: 100,
          buyerId: 10,
          purchaseRequestId: 50,
          totalAmount: 100,
        },
        { insert } as never,
      ),
    ).rejects.toThrow(
      "Failed to allocate a unique random invoice number after 20 attempts",
    );

    expect(insert).toHaveBeenCalledTimes(20);
  });
});
