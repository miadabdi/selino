import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { SupportRepository } from "./support.repository.js";
import { SupportService } from "./support.service.js";

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

describe("SupportService", () => {
  const repository = {
    list: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    addMessage: jest.fn(),
    updateStatus: jest.fn(),
  };
  const service = new SupportService(
    repository as unknown as SupportRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires scoped create permission", async () => {
    await expect(
      service.create(makeUser(["manager.support.create"]), 99, {
        subject: "مشکل گزارش",
        message: "گزارش باز نمی‌شود",
        priority: "normal",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("creates the ticket under the authorized business account", async () => {
    repository.create.mockResolvedValue(12);
    repository.findById.mockResolvedValue({ id: 12, status: "open" });

    await service.create(makeUser(["manager.support.create"]), 20, {
      subject: "مشکل گزارش",
      message: "گزارش باز نمی‌شود",
      priority: "high",
    });

    expect(repository.create).toHaveBeenCalledWith(
      20,
      7,
      expect.objectContaining({ priority: "high" }),
    );
    expect(repository.findById).toHaveBeenCalledWith(20, 12);
  });

  it("does not allow replies to a closed ticket", async () => {
    repository.findById.mockResolvedValue({ id: 12, status: "closed" });

    await expect(
      service.addMessage(makeUser(["manager.support.reply"]), 20, 12, {
        body: "پیگیری",
        fileIds: [],
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(repository.addMessage).not.toHaveBeenCalled();
  });

  it("requires update permission for status changes", async () => {
    await expect(
      service.updateStatus(makeUser(["manager.support.read"]), 20, 12, {
        status: "resolved",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });
});
