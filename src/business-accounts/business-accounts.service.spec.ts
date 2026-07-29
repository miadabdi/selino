import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";

jest.mock("../files/files.service", () => ({
  FilesService: class FilesService {},
}));

import { BusinessAccountsService } from "./business-accounts.service";

const businessUser = (
  permissions: string[],
  businessAccountId = 200,
): AuthenticatedUser =>
  ({
    id: 10,
    isAdmin: false,
    permissions,
    businessMemberships: [
      {
        id: 1,
        businessAccountId,
        businessName: "Store",
        role: "seller_manager",
        permissions,
        isActive: true,
      },
    ],
  }) as AuthenticatedUser;

describe("BusinessAccountsService membership ownership", () => {
  it("rejects creating a second business for an active member", async () => {
    const repository = {
      findActiveMembershipByUserId: jest
        .fn()
        .mockResolvedValue({ id: 1, businessAccountId: 100 }),
    };
    const files = { uploadFromBuffer: jest.fn() };
    const service = new BusinessAccountsService(
      repository as never,
      files as never,
    );

    await expect(
      service.create(10, { name: "Another Store", type: "store" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(files.uploadFromBuffer).not.toHaveBeenCalled();
  });

  it("rejects assigning a user who already belongs to another business", async () => {
    const repository = {
      findActiveBusinessAccountById: jest.fn().mockResolvedValue({ id: 200 }),
      findActiveUserById: jest.fn().mockResolvedValue({ id: 10 }),
      findBusinessMember: jest.fn().mockResolvedValue(undefined),
      findActiveMembershipByUserId: jest
        .fn()
        .mockResolvedValue({ id: 1, businessAccountId: 100 }),
      createMember: jest.fn(),
    };
    const service = new BusinessAccountsService(
      repository as never,
      {} as never,
    );

    await expect(
      service.addMember(businessUser(["seller.team.manage"]), 200, {
        userId: 10,
        role: "seller",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.createMember).not.toHaveBeenCalled();
  });
});

describe("BusinessAccountsService profile, team, and addresses", () => {
  it("persists legal and contact profile fields", async () => {
    const repository = {
      findActiveBusinessAccountById: jest.fn().mockResolvedValue({
        id: 200,
        name: "Store",
        slug: "store",
        logoFileId: null,
      }),
      transaction: jest.fn((callback) => callback({})),
      updateBusinessAccountById: jest
        .fn()
        .mockResolvedValue({ id: 200, legalName: "Store Legal" }),
    };
    const service = new BusinessAccountsService(
      repository as never,
      {} as never,
    );
    const dto = {
      legalName: "Store Legal",
      registrationNumber: "REG-1",
      nationalId: "1234567890",
      taxId: "TAX-1",
      phone: "+982112345678",
      email: "office@example.com",
      website: "https://example.com",
    };

    await service.update(
      businessUser(["manager.dashboard.overview"]),
      200,
      dto,
    );

    expect(repository.updateBusinessAccountById).toHaveBeenCalledWith(
      200,
      dto,
      "Store",
      "store",
      null,
      {},
    );
  });

  it("rejects a cross-business profile read", async () => {
    const service = new BusinessAccountsService({} as never, {} as never);

    await expect(
      service.getProfile(
        businessUser(["manager.dashboard.overview"], 100),
        200,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("prevents demoting the final active manager", async () => {
    const repository = {
      findActiveBusinessAccountById: jest.fn().mockResolvedValue({ id: 200 }),
      findBusinessMemberDetails: jest.fn().mockResolvedValue({
        userId: 10,
        isActive: true,
        role: { name: "manager" },
      }),
      countOtherActiveManagers: jest.fn().mockResolvedValue(0),
      updateMember: jest.fn(),
    };
    const service = new BusinessAccountsService(
      repository as never,
      {} as never,
    );

    await expect(
      service.updateMember(businessUser(["manager.team.manage"]), 200, 10, {
        role: "seller",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.updateMember).not.toHaveBeenCalled();
  });

  it("requires address coordinates to be supplied as a pair", async () => {
    const repository = {
      findActiveBusinessAccountById: jest.fn().mockResolvedValue({ id: 200 }),
      transaction: jest.fn(),
    };
    const service = new BusinessAccountsService(
      repository as never,
      {} as never,
    );

    await expect(
      service.createAddress(businessUser(["manager.dashboard.overview"]), 200, {
        province: "Tehran",
        city: "Tehran",
        addressLine: "Main street",
        latitude: 35.7,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.transaction).not.toHaveBeenCalled();
  });

  it("unsets the old default before creating a new default address", async () => {
    const tx = {};
    const repository = {
      findActiveBusinessAccountById: jest.fn().mockResolvedValue({ id: 200 }),
      transaction: jest.fn((callback) => callback(tx)),
      unsetDefaultAddresses: jest.fn().mockResolvedValue(undefined),
      createAddress: jest.fn().mockResolvedValue({ id: 3, isDefault: true }),
    };
    const service = new BusinessAccountsService(
      repository as never,
      {} as never,
    );

    await service.createAddress(
      businessUser(["manager.dashboard.overview"]),
      200,
      {
        province: "Tehran",
        city: "Tehran",
        addressLine: "Main street",
        isDefault: true,
      },
    );

    expect(repository.unsetDefaultAddresses).toHaveBeenCalledWith(
      200,
      undefined,
      10,
      tx,
    );
    expect(repository.createAddress).toHaveBeenCalledWith(
      expect.objectContaining({
        businessAccountId: 200,
        countryCode: "IR",
        createdBy: 10,
        updatedBy: 10,
        isDefault: true,
      }),
      tx,
    );
  });
});
