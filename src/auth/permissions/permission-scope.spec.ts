import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../interfaces/index";
import {
  assertBusinessPermission,
  resolveBusinessAccountIdForPermission,
  resolveOwnAllScope,
  withIsOwn,
} from "./permission-scope";

describe("permission scope helpers", () => {
  const baseUser = {
    id: 10,
    isAdmin: false,
    permissions: [],
    businessMemberships: [],
  } as AuthenticatedUser;

  it("resolves own scope when user has only own permission", () => {
    const user = {
      ...baseUser,
      permissions: ["seller.purchase-requests.read.own"],
      businessMemberships: [
        {
          id: 1,
          businessAccountId: 100,
          businessName: "Seller",
          role: "seller",
          permissions: ["seller.purchase-requests.read.own"],
          isActive: true,
        },
      ],
    } as AuthenticatedUser;

    expect(
      resolveOwnAllScope(
        user,
        "seller.purchase-requests.read.own",
        "seller.purchase-requests.read.all",
      ),
    ).toEqual({ mode: "own", userId: 10 });
  });

  it("resolves all scope to the business membership that grants all permission", () => {
    const user = {
      ...baseUser,
      permissions: ["seller.purchase-requests.read.all"],
      businessMemberships: [
        {
          id: 1,
          businessAccountId: 100,
          businessName: "Seller",
          role: "seller_manager",
          permissions: ["seller.purchase-requests.read.all"],
          isActive: true,
        },
      ],
    } as AuthenticatedUser;

    expect(
      resolveOwnAllScope(
        user,
        "seller.purchase-requests.read.own",
        "seller.purchase-requests.read.all",
      ),
    ).toEqual({ mode: "all", userId: 10, businessAccountId: 100 });
  });

  it("rejects business scoped permission for another business account", () => {
    const user = {
      ...baseUser,
      permissions: ["seller.inventory.read"],
      businessMemberships: [
        {
          id: 1,
          businessAccountId: 100,
          businessName: "Seller",
          role: "seller",
          permissions: ["seller.inventory.read"],
          isActive: true,
        },
      ],
    } as AuthenticatedUser;

    expect(() =>
      assertBusinessPermission(user, 200, "seller.inventory.read"),
    ).toThrow(ForbiddenException);
  });

  it("resolves the active business account that grants a permission", () => {
    const user = {
      ...baseUser,
      permissions: ["seller.inventory.read"],
      businessMemberships: [
        {
          id: 1,
          businessAccountId: 100,
          businessName: "Without permission",
          role: "seller",
          permissions: [],
          isActive: true,
        },
        {
          id: 2,
          businessAccountId: 200,
          businessName: "With permission",
          role: "seller",
          permissions: ["seller.inventory.read"],
          isActive: true,
        },
      ],
    } as AuthenticatedUser;

    expect(
      resolveBusinessAccountIdForPermission(user, "seller.inventory.read"),
    ).toBe(200);
  });

  it("uses the first active business account for admin users without scoped permissions", () => {
    const user = {
      ...baseUser,
      isAdmin: true,
      businessMemberships: [
        {
          id: 1,
          businessAccountId: 100,
          businessName: "Admin business",
          role: "manager",
          permissions: [],
          isActive: true,
        },
      ],
    } as AuthenticatedUser;

    expect(resolveBusinessAccountIdForPermission(user, "any.permission")).toBe(
      100,
    );
  });

  it("computes isOwn from requester or buyer ownership fields", () => {
    expect(withIsOwn({ id: 1, requesterId: 10 }, 10)).toEqual({
      id: 1,
      requesterId: 10,
      isOwn: true,
    });
    expect(withIsOwn({ id: 2, buyerId: 20 }, 10)).toEqual({
      id: 2,
      buyerId: 20,
      isOwn: false,
    });
  });
});
