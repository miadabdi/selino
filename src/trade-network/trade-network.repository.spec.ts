import type { Database } from "../database/database.types.js";
import { TradeNetworkRepository } from "./trade-network.repository.js";

function collectSqlText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  if (Array.isArray(node)) return node.map(collectSqlText).join("");
  const record = node as Record<string, unknown>;
  const ownText = Array.isArray(record.value)
    ? record.value.filter((value): value is string => typeof value === "string")
    : [];
  return (
    ownText.join("") +
    Object.entries(record)
      .filter(([key]) => key !== "value")
      .map(([, value]) => collectSqlText(value))
      .join("")
  );
}

describe("TradeNetworkRepository credit read model", () => {
  it("calculates agreement totals independently of the requested page", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 1,
        creditLimit: 1000,
        usedCredit: 400,
        buyerBusinessAccount: { name: "خریدار" },
        supplierBusinessAccount: { name: "تامین کننده" },
      },
    ]);
    const select = jest
      .fn()
      .mockImplementationOnce(() => ({
        from: () => ({
          where: jest.fn().mockResolvedValue([{ total: 21 }]),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: jest.fn().mockResolvedValue([
            {
              creditLimit: 10000,
              usedCredit: 2500,
              activeAgreementCount: 12,
            },
          ]),
        }),
      }));
    const repository = new TradeNetworkRepository({
      query: { tradeCreditAgreements: { findMany } },
      select,
    } as never);

    const result = await repository.listAgreements({
      businessAccountId: 50,
      page: 2,
      limit: 1,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(21);
    expect(result.summary).toEqual({
      creditLimit: 10000,
      usedCredit: 2500,
      activeAgreementCount: 12,
      availableCredit: 7500,
      utilizationPercent: 25,
    });
  });

  it("returns enriched rows and a summary independent of pagination", async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 12,
          transactionCode: "CRD-12",
          buyerName: "خریدار",
          supplierName: "تامین کننده",
          productName: "کالای نمونه",
          status: "completed",
          amount: 500,
        },
      ])
      .mockResolvedValueOnce([{ total: 33 }])
      .mockResolvedValueOnce([
        {
          transactionCount: 33,
          debitAmount: 7000,
          creditAmount: 2000,
          netAmount: 5000,
        },
      ]);
    const repository = new TradeNetworkRepository({
      execute,
    } as unknown as Database);

    const result = await repository.listCreditTransactions(9, {
      type: "purchase",
      status: "completed",
      search: "کالا",
      page: 2,
      limit: 10,
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          transactionCode: "CRD-12",
          productName: "کالای نمونه",
          status: "completed",
        }),
      ],
      page: 2,
      limit: 10,
      total: 33,
      summary: {
        transactionCount: 33,
        debitAmount: 7000,
        creditAmount: 2000,
        netAmount: 5000,
      },
    });
    expect(collectSqlText(execute.mock.calls[0][0])).toContain("limit");
    expect(collectSqlText(execute.mock.calls[2][0])).not.toContain("offset");
  });
});
