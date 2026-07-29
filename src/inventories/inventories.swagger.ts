import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
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

export const ControllerDocs = () =>
  ProtectedApi("Business Account Inventories");

const businessId = () =>
  NumericIdParam(
    "businessAccountId",
    "Business account that owns the inventory",
  );
const inventoryId = () => NumericIdParam("id", "Inventory entry ID");

export const Create = () =>
  applyDecorators(
    ApiOperation({
      summary: "Add a product to a business inventory",
      description:
        "Creates a sellable inventory entry for a product. When initial stock is positive, also records a matching restock transaction in the immutable stock ledger.",
    }),
    businessId(),
    ApiCreatedResponse({ description: "The new inventory entry." }),
    ApiBadRequestResponse({
      description: "The product or submitted inventory fields are invalid.",
      type: ApiErrorResponse,
    }),
    ApiNotFoundResponse({
      description: "The business account does not exist or was deleted.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const Restock = () =>
  applyDecorators(
    ApiOperation({
      summary: "Increase an inventory's stock",
      description:
        "Atomically increases stock by the positive quantity and appends a `restock` or `adjustment` entry to the stock transaction ledger.",
    }),
    businessId(),
    inventoryId(),
    ApiOkResponse({ description: "The inventory after restocking." }),
    ApiNotFoundResponse({
      description: "The inventory does not belong to this business account.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const List = () =>
  applyDecorators(
    ApiOperation({
      summary: "List a business's inventory",
      description:
        "Returns all inventory entries owned by the business account, including stock availability and product details provided by the repository relation.",
    }),
    businessId(),
    ApiOkResponse({
      description: "The business inventory entries.",
      isArray: true,
    }),
    ApiNotFoundResponse({
      description: "The business account does not exist or was deleted.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const Update = () =>
  applyDecorators(
    ApiOperation({
      summary: "Update inventory sales settings",
      description:
        "Updates price, order limits, visibility, or active status. Stock quantities are intentionally excluded; use the restock endpoint for auditable stock changes.",
    }),
    businessId(),
    inventoryId(),
    ApiOkResponse({ description: "The updated inventory entry." }),
    ApiNotFoundResponse({
      description: "The inventory does not belong to this business account.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const ListTransactions = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get an inventory's stock ledger",
      description:
        "Returns the chronological stock transactions for one inventory entry, including restocks, adjustments, reservations, releases, and sales where recorded.",
    }),
    businessId(),
    inventoryId(),
    ApiOkResponse({
      description: "The stock transaction ledger.",
      isArray: true,
    }),
    ApiNotFoundResponse({
      description: "The inventory does not belong to this business account.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );
