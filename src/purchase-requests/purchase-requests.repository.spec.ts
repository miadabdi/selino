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

describe("PurchaseRequestsRepository seller list identity", () => {
  const request = {
    id: 50,
    code: "PR-1405-000050",
    items: [
      {
        id: 7,
        productId: 11,
        product: { id: 11, title: "کالای نمونه" },
      },
    ],
  };

  it("loads product identity and title for the active request", async () => {
    const findFirst = jest.fn().mockResolvedValue(request);
    const repository = new PurchaseRequestsRepository({
      query: { purchaseRequests: { findFirst } },
    } as never);

    await expect(
      repository.findActiveWithItemsByRequester(10, 100),
    ).resolves.toBe(request);

    const query = findFirst.mock.calls[0][0];
    expect(query.with.items.with.product).toBe(true);
    expect(request).toMatchObject({
      code: "PR-1405-000050",
      items: [
        {
          productId: 11,
          product: { id: 11, title: "کالای نمونه" },
        },
      ],
    });
  });

  it("loads product identity and title for paginated request rows", async () => {
    const findMany = jest.fn().mockResolvedValue([request]);
    const where = jest.fn().mockResolvedValue([{ total: 1 }]);
    const from = jest.fn(() => ({ where }));
    const select = jest.fn(() => ({ from }));
    const repository = new PurchaseRequestsRepository({
      query: { purchaseRequests: { findMany } },
      select,
    } as never);

    await expect(
      repository.listByBuyerBusiness(100, 1, 20, 10),
    ).resolves.toEqual({
      items: [request],
      page: 1,
      limit: 20,
      total: 1,
    });

    const query = findMany.mock.calls[0][0];
    expect(query.with.items.with.product).toBe(true);
    expect(request.code).toBe("PR-1405-000050");
    expect(request.items[0]?.product.title).toBe("کالای نمونه");
  });
});
