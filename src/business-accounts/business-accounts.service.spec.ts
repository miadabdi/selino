import { ConflictException } from "@nestjs/common";

jest.mock("../files/files.service", () => ({
  FilesService: class FilesService {},
}));

import { BusinessAccountsService } from "./business-accounts.service";

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
      service.addMember(200, { userId: 10, role: "seller" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.createMember).not.toHaveBeenCalled();
  });
});
