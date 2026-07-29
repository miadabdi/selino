import type { AuthenticatedUser } from "../auth/interfaces/index";
import { WalletsRepository } from "./wallets.repository";
import { WalletsService } from "./wallets.service";

const user = {
  id: 10,
  isAdmin: false,
  permissions: ["manager.credit.manage"],
  businessMemberships: [
    {
      id: 1,
      businessAccountId: 100,
      businessName: "فروشگاه نمونه",
      role: "manager",
      permissions: ["manager.credit.manage"],
      isActive: true,
    },
  ],
} as AuthenticatedUser;

describe("WalletsService", () => {
  const tx = {};
  const repository = {
    transaction: jest.fn((callback) => callback(tx)),
    findByBusinessAccountForUpdate: jest.fn(),
    create: jest.fn(),
    findTransactionByIdempotencyKey: jest.fn(),
    changeBalance: jest.fn(),
    createTransaction: jest.fn(),
  };
  const service = new WalletsService(
    repository as unknown as WalletsRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it("applies an adjustment and records the resulting balance atomically", async () => {
    repository.findByBusinessAccountForUpdate.mockResolvedValue({
      id: 4,
      balance: 100,
      status: "active",
    });
    repository.findTransactionByIdempotencyKey.mockResolvedValue(null);
    repository.changeBalance.mockResolvedValue({ id: 4, balance: 150 });
    repository.createTransaction.mockResolvedValue({ id: 8 });

    await expect(
      service.adjust(100, user, {
        direction: "credit",
        amount: 50,
        reference: "adjust-1",
      }),
    ).resolves.toMatchObject({ idempotent: false });

    expect(repository.changeBalance).toHaveBeenCalledWith(4, 50, tx);
    expect(repository.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: 4,
        amount: 50,
        balanceAfter: 150,
        idempotencyKey: "adjust-1",
      }),
      tx,
    );
  });

  it("returns the existing ledger entry for a repeated reference", async () => {
    const wallet = { id: 4, balance: 100, status: "active" };
    const transaction = { id: 9, idempotencyKey: "adjust-1" };
    repository.findByBusinessAccountForUpdate.mockResolvedValue(wallet);
    repository.findTransactionByIdempotencyKey.mockResolvedValue(transaction);

    await expect(
      service.adjust(100, user, {
        direction: "debit",
        amount: 50,
        reference: "adjust-1",
      }),
    ).resolves.toEqual({ wallet, transaction, idempotent: true });
    expect(repository.changeBalance).not.toHaveBeenCalled();
  });

  it("rejects a debit that would overdraw the wallet", async () => {
    repository.findByBusinessAccountForUpdate.mockResolvedValue({
      id: 4,
      balance: 20,
      status: "active",
    });
    repository.findTransactionByIdempotencyKey.mockResolvedValue(null);
    repository.changeBalance.mockResolvedValue(undefined);

    await expect(
      service.adjust(100, user, {
        direction: "debit",
        amount: 50,
        reference: "adjust-2",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
