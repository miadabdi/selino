import type { Database } from "../database/database.types.js";
import { ReportsRepository } from "./reports.repository.js";

describe("ReportsRepository period comparisons", () => {
  it("keeps delivery rate separate from true previous-period growth", async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([
        {
          grossSales: 1200,
          grossPurchases: 400,
          paidSales: 900,
          outstandingSales: 300,
          orderCount: 8,
          deliveredOrderCount: 6,
          previousGrossSales: 800,
          previousOrderCount: 10,
          walletBalance: 100,
          creditLimit: 2000,
          usedCredit: 500,
          currency: "IRR",
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const repository = new ReportsRepository({
      execute,
    } as unknown as Database);

    const result = await repository.getReport(20, {
      from: new Date("2026-07-01T00:00:00.000Z"),
      to: new Date("2026-08-01T00:00:00.000Z"),
      granularity: "day",
    });

    expect(result.summary).toEqual(
      expect.objectContaining({
        averageOrderValue: 150,
        deliveryRate: 75,
        previousGrossSales: 800,
        salesGrowthPercent: 50,
        previousOrderCount: 10,
        orderGrowthPercent: -20,
      }),
    );
  });

  it("returns zero changes for two empty periods", async () => {
    const execute = jest.fn().mockResolvedValue([]);
    const repository = new ReportsRepository({
      execute,
    } as unknown as Database);

    const result = await repository.getReport(20, {
      from: new Date("2026-07-01T00:00:00.000Z"),
      to: new Date("2026-08-01T00:00:00.000Z"),
      granularity: "week",
    });

    expect(result.summary).toEqual(
      expect.objectContaining({
        grossSales: 0,
        orderCount: 0,
        deliveryRate: 0,
        salesGrowthPercent: 0,
        orderGrowthPercent: 0,
      }),
    );
  });
});
