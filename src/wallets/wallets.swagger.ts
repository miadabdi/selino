import { applyDecorators } from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from "@nestjs/swagger";
import {
  ApiErrorResponse,
  AuthenticationErrors,
  NumericIdParam,
  ProtectedApi,
} from "../swagger/swagger.decorators";

export const ControllerDocs = () => ProtectedApi("Wallets");
const businessId = () =>
  NumericIdParam("businessAccountId", "Business account that owns the wallet");

export const GetWallet = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get the business wallet balance",
      description:
        "Returns the selected business's current wallet balance and currency.",
    }),
    businessId(),
    ApiOkResponse({ description: "Wallet balance and currency." }),
    AuthenticationErrors(),
  );

export const ListTransactions = () =>
  applyDecorators(
    ApiOperation({
      summary: "List the append-only wallet ledger",
      description:
        "Returns paginated credit and debit entries recorded against the business wallet.",
    }),
    businessId(),
    ApiOkResponse({ description: "Paginated wallet transactions." }),
    AuthenticationErrors(),
  );

export const Adjust = () =>
  applyDecorators(
    ApiOperation({
      summary: "Apply an idempotent manual wallet adjustment",
      description:
        "Credits or debits the wallet once for the supplied idempotency key and records the resulting ledger entry.",
    }),
    businessId(),
    ApiCreatedResponse({ description: "Updated wallet and ledger entry." }),
    ApiConflictResponse({
      description: "The debit would make the wallet balance negative.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );
