import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "./permissions.guard";

describe("PermissionsGuard", () => {
  const contextFor = (user: object) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  const reflector = {
    getAllAndOverride: jest
      .fn()
      .mockReturnValue(["seller.purchase-requests.read"]),
  } as unknown as Reflector;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows admins without membership permissions", () => {
    const guard = new PermissionsGuard(reflector);

    expect(
      guard.canActivate(contextFor({ id: 1, isAdmin: true, permissions: [] })),
    ).toBe(true);
  });

  it("allows a user with the required permission", () => {
    const guard = new PermissionsGuard(reflector);

    expect(
      guard.canActivate(
        contextFor({
          id: 2,
          isAdmin: false,
          permissions: ["seller.purchase-requests.read"],
        }),
      ),
    ).toBe(true);
  });

  it("denies a collector without the required permission", () => {
    const guard = new PermissionsGuard(reflector);

    expect(() =>
      guard.canActivate(
        contextFor({
          id: 3,
          isAdmin: false,
          permissions: ["collector.products.read"],
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
