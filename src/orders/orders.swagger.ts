import { applyDecorators } from "@nestjs/common";
import {
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

export const ControllerDocs = () => ProtectedApi("Orders");
const businessId = () =>
  NumericIdParam(
    "businessAccountId",
    "Business account participating in order",
  );
const errors = () =>
  applyDecorators(
    ApiNotFoundResponse({ type: ApiErrorResponse }),
    ApiConflictResponse({ type: ApiErrorResponse }),
    AuthenticationErrors(),
  );
export const List = () =>
  applyDecorators(
    ApiOperation({
      summary: "List and filter business orders",
      description:
        "Returns paginated orders where the selected business is the buyer or supplier, including real party names, invoice items and quantities, delivery address, and the latest linked shipment.",
    }),
    businessId(),
    ApiOkResponse({ description: "Paginated orders." }),
    errors(),
  );
export const GetOrder = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get an order and status timeline",
      description:
        "Returns one participating business order with its invoice, shipment, and ordered status events.",
    }),
    businessId(),
    NumericIdParam("id", "Order ID"),
    ApiOkResponse({ description: "Order with status events." }),
    errors(),
  );
export const DeriveFromInvoice = () =>
  applyDecorators(
    ApiOperation({
      summary: "Idempotently derive an order from a confirmed invoice",
      description:
        "Creates the fulfillment order for a confirmed invoice, or returns the existing derived order.",
    }),
    businessId(),
    NumericIdParam("invoiceId", "Confirmed invoice ID"),
    ApiCreatedResponse({ description: "New or existing derived order." }),
    errors(),
  );
export const UpdateStatus = () =>
  applyDecorators(
    ApiOperation({
      summary: "Advance or cancel an order",
      description:
        "Applies a valid lifecycle transition and records an immutable order status event.",
    }),
    businessId(),
    NumericIdParam("id", "Order ID"),
    ApiOkResponse({ description: "Updated order." }),
    errors(),
  );
