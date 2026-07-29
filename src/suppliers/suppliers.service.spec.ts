import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { SuppliersRepository } from "./suppliers.repository.js";
import { SuppliersService } from "./suppliers.service.js";

function makeUser(permissions: string[]): AuthenticatedUser {
  return {
    id: 7,
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

describe("SuppliersService", () => {
  const repository = {
    list: jest.fn(),
    findById: jest.fn(),
    businessExists: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const service = new SuppliersService(
    repository as unknown as SuppliersRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects access to a supplier list outside the permitted business", () => {
    expect(() =>
      service.list(makeUser(["manager.suppliers.read"]), 99, {
        page: 1,
        limit: 20,
      }),
    ).toThrow(ForbiddenException);
    expect(repository.list).not.toHaveBeenCalled();
  });

  it("creates a scoped supplier link and returns its enriched details", async () => {
    repository.businessExists.mockResolvedValue(true);
    repository.create.mockResolvedValue(12);
    repository.findById.mockResolvedValue({ id: 12 });

    await expect(
      service.create(makeUser(["manager.suppliers.create"]), 20, {
        supplierBusinessAccountId: 30,
        notes: "اصلی",
      }),
    ).resolves.toEqual({ id: 12 });
    expect(repository.create).toHaveBeenCalledWith(20, 7, {
      supplierBusinessAccountId: 30,
      notes: "اصلی",
    });
    expect(repository.findById).toHaveBeenCalledWith(20, 12);
  });

  it("does not allow linking the business to itself", async () => {
    await expect(
      service.create(makeUser(["manager.suppliers.create"]), 20, {
        supplierBusinessAccountId: 20,
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("requires delete permission before soft deleting a link", async () => {
    await expect(
      service.remove(makeUser(["manager.suppliers.update"]), 20, 12),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
