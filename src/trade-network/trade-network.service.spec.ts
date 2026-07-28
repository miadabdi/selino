import { HttpException, ValidationPipe } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { SearchTradeOffersQueryDto } from "./dto/search-trade-offers-query.dto";
import { TradeNetworkService } from "./trade-network.service";

describe("TradeNetworkService", () => {
  const user = {
    id: 10,
    isAdmin: false,
    businessMemberships: [
      {
        id: 1,
        businessAccountId: 100,
        businessName: "Buyer",
        role: "seller",
        permissions: [],
        isActive: true,
      },
    ],
  } as AuthenticatedUser;

  function createService(repository: Record<string, jest.Mock>) {
    const configService = {
      getOrThrow: jest.fn((key: string) =>
        key === "CREDIT_APPROVAL_EXPIRY_MINUTES" ? 60 : 60000,
      ),
    };
    const notificationService = { send: jest.fn() };
    return new TradeNetworkService(
      repository as never,
      {} as never,
      {} as never,
      configService as never,
      notificationService as never,
    );
  }

  it("returns null when a confirmed purchase has no active agreement", async () => {
    const repository = {
      findActiveAgreementForBuyerSupplier: jest.fn().mockResolvedValue(null),
    };
    const service = createService(repository);

    await expect(
      service.recordCreditPurchase(
        user,
        100,
        200,
        500,
        "invoice",
        300,
        {} as never,
      ),
    ).resolves.toBeNull();
  });

  it("throws when active agreement credit limit is exceeded", async () => {
    const repository = {
      findActiveAgreementForBuyerSupplier: jest.fn().mockResolvedValue({
        id: 1,
        currency: "IRR",
      }),
      consumeCredit: jest.fn().mockResolvedValue(undefined),
    };
    const service = createService(repository);

    await expect(
      service.recordCreditPurchase(
        user,
        100,
        200,
        500,
        "invoice",
        300,
        {} as never,
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("creates a transaction and audit log for an active agreement", async () => {
    const transaction = { id: 20 };
    const repository = {
      findActiveAgreementForBuyerSupplier: jest.fn().mockResolvedValue({
        id: 1,
        currency: "IRR",
      }),
      consumeCredit: jest.fn().mockResolvedValue({ id: 1 }),
      createTransaction: jest.fn().mockResolvedValue(transaction),
      createAuditLog: jest.fn().mockResolvedValue(undefined),
    };
    const service = createService(repository);

    await expect(
      service.recordCreditPurchase(
        user,
        100,
        200,
        500,
        "invoice",
        300,
        {} as never,
      ),
    ).resolves.toBe(transaction);

    expect(repository.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId: 1,
        type: "purchase",
        amount: 500,
        referenceType: "invoice",
        referenceId: 300,
      }),
      {},
    );
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId: 1,
        action: "transaction_created",
        actorBusinessAccountId: 100,
      }),
      {},
    );
  });

  it("approves credit purchase preparation when projected debt is within limit", async () => {
    const agreement = {
      id: 1,
      usedCredit: 400,
      creditLimit: 1000,
      currency: "IRR",
    };
    const repository = {
      findActiveAgreementForBuyerSupplier: jest
        .fn()
        .mockResolvedValue(agreement),
    };
    const service = createService(repository);

    await expect(
      service.prepareCreditPurchase(user, 100, 200, 500, 300, 400, {} as never),
    ).resolves.toEqual({
      status: "approved_within_limit",
      agreement,
    });
  });

  it("creates pending approval when projected debt exceeds limit", async () => {
    const agreement = {
      id: 1,
      buyerBusinessAccountId: 100,
      supplierBusinessAccountId: 200,
      usedCredit: 900,
      creditLimit: 1000,
      currency: "IRR",
    };
    const approvalRequest = { id: 30 };
    const repository = {
      findActiveAgreementForBuyerSupplier: jest
        .fn()
        .mockResolvedValue(agreement),
      findPendingApprovalByInvoiceId: jest.fn().mockResolvedValue(null),
      createApprovalRequest: jest.fn().mockResolvedValue(approvalRequest),
      createAuditLog: jest.fn().mockResolvedValue(undefined),
    };
    const service = createService(repository);

    await expect(
      service.prepareCreditPurchase(user, 100, 200, 250, 300, 400, {} as never),
    ).resolves.toEqual({
      status: "pending_approval",
      approvalRequest,
    });

    expect(repository.createApprovalRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId: 1,
        purchaseRequestId: 300,
        invoiceId: 400,
        ownerBusinessAccountId: 200,
        requestedAmount: 250,
        debtLimit: 1000,
        currentDebt: 900,
        projectedDebt: 1150,
        overLimitAmount: 150,
        status: "pending",
      }),
      {},
    );
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "over_limit_requested",
        actorBusinessAccountId: 100,
      }),
      {},
    );
  });
});

describe("SearchTradeOffersQueryDto", () => {
  it("accepts true and false string values for contractOnly", async () => {
    const dto = plainToInstance(SearchTradeOffersQueryDto, {
      contractOnly: "true",
      page: "1",
      limit: "20",
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.contractOnly).toBe(true);
  });

  it("rejects limit values above 50", async () => {
    const dto = plainToInstance(SearchTradeOffersQueryDto, {
      limit: "51",
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === "limit")).toBe(true);
  });

  it("rejects unsupported sort values", async () => {
    const dto = plainToInstance(SearchTradeOffersQueryDto, {
      sort: "contract_first",
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === "sort")).toBe(true);
  });

  it("rejects unknown query params through the global validation settings", async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      pipe.transform(
        { unexpected: "value" },
        { type: "query", metatype: SearchTradeOffersQueryDto },
      ),
    ).rejects.toBeInstanceOf(Error);
  });
});
