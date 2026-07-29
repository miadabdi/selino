import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from "@nestjs/swagger";
import {
  ApiErrorResponse,
  AuthenticationErrors,
  NumericIdParam,
  ProtectedApi,
} from "../swagger/swagger.decorators";

export const ControllerDocs = () => ProtectedApi("Payments");
const businessId = () =>
  NumericIdParam("businessAccountId", "Business account paying the invoice");
const paymentId = () => NumericIdParam("id", "Payment ID");
const paymentErrors = () =>
  applyDecorators(
    ApiBadRequestResponse({ type: ApiErrorResponse }),
    ApiNotFoundResponse({ type: ApiErrorResponse }),
    ApiConflictResponse({ type: ApiErrorResponse }),
    AuthenticationErrors(),
  );

export const CreateIntent = () =>
  applyDecorators(
    ApiOperation({
      summary: "Create an idempotent provider-neutral payment intent",
      description:
        "Creates or returns a pending payment intent for an invoice using the supplied idempotency key.",
    }),
    businessId(),
    ApiCreatedResponse({ description: "Pending payment intent." }),
    paymentErrors(),
  );
export const GetPayment = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get payment state",
      description:
        "Returns one payment owned by the selected buyer business and its current lifecycle state.",
    }),
    businessId(),
    paymentId(),
    ApiOkResponse({ description: "Payment state." }),
    paymentErrors(),
  );
export const Complete = () =>
  applyDecorators(
    ApiOperation({
      summary: "Atomically complete a verified payment",
      description:
        "Debits the buyer wallet when selected, credits the supplier wallet, records both ledger entries, and marks the invoice paid in one database transaction.",
    }),
    businessId(),
    paymentId(),
    ApiOkResponse({ description: "Completed payment." }),
    paymentErrors(),
  );
export const Refund = () =>
  applyDecorators(
    ApiOperation({
      summary: "Atomically apply an idempotent full or partial refund",
      description:
        "Reverses all or part of a completed payment, updates both wallets and ledgers, and records the refund state atomically.",
    }),
    businessId(),
    paymentId(),
    ApiCreatedResponse({ description: "Updated payment refund state." }),
    paymentErrors(),
  );
