import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { DashboardRepository } from "./dashboard.repository.js";
import { DashboardService } from "./dashboard.service.js";

function makeUser(permissions: string[]): AuthenticatedUser {
  return {
    id: 1,
    isAdmin: false,
    permissions,
    businessMemberships: [
      {
        id: 2,
        businessAccountId: 20,
        businessName: "فروشگاه نمونه",
        role: "manager",
        permissions,
        isActive: true,
      },
    ],
  } as AuthenticatedUser;
}

describe("DashboardService", () => {
  const repository = {
    getOverview: jest.fn(),
  };
  const service = new DashboardService(
    repository as unknown as DashboardRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.getOverview.mockResolvedValue({
      summary: {},
      salesTrend: [],
      recentOrders: [],
    });
  });

  it("returns real repository aggregates for the authorized business", async () => {
    await service.getOverview(makeUser(["manager.dashboard.read"]), 20, {
      from: "2026-07-01",
      to: "2026-07-31",
    });

    expect(repository.getOverview).toHaveBeenCalledWith(
      20,
      expect.objectContaining({
        from: new Date("2026-07-01T00:00:00.000Z"),
        to: new Date("2026-08-01T00:00:00.000Z"),
      }),
    );
  });

  it("allows a seller dashboard overview permission", async () => {
    await service.getOverview(makeUser(["seller.dashboard.overview"]), 20, {});

    expect(repository.getOverview).toHaveBeenCalledWith(20, expect.any(Object));
  });

  it("allows the manager overview permission alias", async () => {
    await service.getOverview(makeUser(["manager.dashboard.overview"]), 20, {});

    expect(repository.getOverview).toHaveBeenCalledWith(20, expect.any(Object));
  });

  it("rejects a manager from another business account", async () => {
    await expect(
      service.getOverview(makeUser(["manager.dashboard.read"]), 99, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.getOverview).not.toHaveBeenCalled();
  });

  it("rejects an inverted date range", async () => {
    await expect(
      service.getOverview(makeUser(["manager.dashboard.read"]), 20, {
        from: "2026-08-01",
        to: "2026-07-01",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
