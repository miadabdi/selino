import type { Database } from "../database/database.types.js";
import { DashboardRepository } from "./dashboard.repository.js";

function collectSqlValues(node: unknown): unknown[] {
  if (node === null || node === undefined) return [];
  if (typeof node !== "object") return [node];
  if (Array.isArray(node)) return node.flatMap(collectSqlValues);
  if (node.constructor.name === "StringChunk") return [];

  const record = node as Record<string, unknown>;
  const values =
    "value" in record && !Array.isArray(record.value) ? [record.value] : [];
  const childValues = Object.entries(record)
    .filter(([key]) => key !== "value")
    .flatMap(([, value]) => collectSqlValues(value));

  return [...values, ...childValues];
}

function collectSqlText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  if (Array.isArray(node)) return node.map(collectSqlText).join("");

  const record = node as Record<string, unknown>;
  const value = Array.isArray(record.value)
    ? record.value.filter((item): item is string => typeof item === "string")
    : [];
  const childText = Object.entries(record)
    .filter(([key]) => key !== "value")
    .map(([, item]) => collectSqlText(item))
    .join("");

  return `${value.join("")}${childText}`;
}

describe("DashboardRepository", () => {
  it("returns exact invoice status counts and serializes SQL date parameters", async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([
        {
          salesAmount: 101,
          purchaseAmount: 102,
          activeOrders: 103,
          completedOrders: 104,
          walletBalance: 105,
          creditLimit: 106,
          usedCredit: 107,
          currency: "IRR",
          newPurchaseRequests: 201,
          pendingCreditPurchaseRequests: 202,
          confirmedPurchaseRequests: 203,
          cancelledPurchaseRequests: 204,
          activePurchaseInvoices: 301,
          historicalPurchaseInvoices: 302,
          paidPurchaseInvoices: 303,
          pendingPurchaseInvoices: 304,
          sentPurchaseInvoices: 305,
          todayPaidPurchaseInvoices: 401,
          todayActivePurchaseInvoices: 402,
          todayPendingPurchaseInvoices: 403,
          todaySentPurchaseInvoices: 404,
          outstandingPurchaseAmount: 306,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const repository = new DashboardRepository({
      execute,
    } as unknown as Database);
    const range = {
      from: new Date("2026-07-01T00:00:00.000Z"),
      to: new Date("2026-08-01T00:00:00.000Z"),
    };

    const overview = await repository.getOverview(20, range);

    expect(overview.sellerSummary).toEqual(
      expect.objectContaining({
        activePurchaseInvoices: 301,
        historicalPurchaseInvoices: 302,
        paidPurchaseInvoices: 303,
        pendingPurchaseInvoices: 304,
        sentPurchaseInvoices: 305,
        todayPaidPurchaseInvoices: 401,
        todayActivePurchaseInvoices: 402,
        todayPendingPurchaseInvoices: 403,
        todaySentPurchaseInvoices: 404,
      }),
    );

    const sqlValues = execute.mock.calls.flatMap(([query]) =>
      collectSqlValues(query),
    );
    expect(sqlValues).toContain("2026-07-01T00:00:00.000Z");
    expect(sqlValues).toContain("2026-08-01T00:00:00.000Z");
    expect(sqlValues.some((value) => value instanceof Date)).toBe(false);

    const summarySql = collectSqlText(execute.mock.calls[0][0]);
    expect(summarySql).toContain("where i.status = 'paid'");
    expect(summarySql).toContain("where i.status = 'pending'");
    expect(summarySql).toContain("where i.status = 'sent'");
    expect(summarySql).toContain("date_trunc('day', now())");
  });

  it("returns zero invoice counters when no aggregate row is returned", async () => {
    const execute = jest.fn().mockResolvedValue([]);
    const repository = new DashboardRepository({
      execute,
    } as unknown as Database);

    const overview = await repository.getOverview(20, {
      from: new Date("2026-07-01T00:00:00.000Z"),
      to: new Date("2026-08-01T00:00:00.000Z"),
    });

    expect(overview.sellerSummary).toEqual(
      expect.objectContaining({
        activePurchaseInvoices: 0,
        historicalPurchaseInvoices: 0,
        paidPurchaseInvoices: 0,
        pendingPurchaseInvoices: 0,
        sentPurchaseInvoices: 0,
        todayPaidPurchaseInvoices: 0,
        todayActivePurchaseInvoices: 0,
        todayPendingPurchaseInvoices: 0,
        todaySentPurchaseInvoices: 0,
      }),
    );
  });
});
