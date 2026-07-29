import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from "@nestjs/swagger";
import { MessageResponse } from "../auth/responses/index";
import {
  ApiErrorResponse,
  AuthenticationErrors,
  NumericIdParam,
  ProtectedApi,
} from "../swagger/swagger.decorators";

export const ControllerDocs = () => ProtectedApi("Purchase Requests");

const requestId = () => NumericIdParam("id", "Purchase request ID");

export const AddItem = () =>
  applyDecorators(
    ApiOperation({
      summary: "Add an item to the active purchase request",
      description:
        "Reserves stock and adds a priced item to the authenticated user's open request for the selected buyer business. Items from multiple suppliers share that request.",
    }),
    ApiCreatedResponse({
      description: "The newly reserved purchase-request item.",
    }),
    ApiNotFoundResponse({
      description: "The selected inventory entry does not exist.",
      type: ApiErrorResponse,
    }),
    ApiConflictResponse({
      description:
        "Stock is unavailable or the total quantity exceeds the inventory maximum.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const RemoveItem = () =>
  applyDecorators(
    ApiOperation({
      summary: "Remove an item from an open purchase request",
      description:
        "Deletes an item from an open request for the caller's business, releases its reserved stock, and recalculates the request total. Removing the last item cancels the empty request.",
    }),
    NumericIdParam("itemId", "Purchase-request item ID"),
    ApiOkResponse({
      description: "The item was removed and its stock released.",
      type: MessageResponse,
    }),
    ApiNotFoundResponse({
      description: "The item is missing or no longer open.",
      type: ApiErrorResponse,
    }),
    ApiConflictResponse({
      description: "The reserved stock could not be released consistently.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const UpdateItem = () =>
  applyDecorators(
    ApiOperation({
      summary: "Update an open purchase-request item quantity",
      description:
        "Atomically adjusts the reserved stock by the quantity difference, updates the priced line total, and recalculates the open request total.",
    }),
    NumericIdParam("itemId", "Purchase-request item ID"),
    ApiOkResponse({
      description: "The purchase-request item with its updated quantity.",
    }),
    ApiNotFoundResponse({
      description: "The item is missing, expired, or no longer open.",
      type: ApiErrorResponse,
    }),
    ApiConflictResponse({
      description:
        "The quantity violates inventory limits or reserved stock cannot be adjusted consistently.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const GetActive = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get the user's active purchase request",
      description:
        "Returns the authenticated user's current unexpired request for `buyerBusinessAccountId`, including supplier information for grouping, or `null`.",
    }),
    ApiOkResponse({
      description: "The active request with items, or null.",
      schema: { nullable: true, type: "object", additionalProperties: true },
    }),
    AuthenticationErrors(),
  );

export const List = () =>
  applyDecorators(
    ApiOperation({
      summary: "List the business's purchase requests",
      description:
        "Returns paginated current and historical requests for the authenticated caller's business. Admins can list all businesses or filter with `buyerBusinessAccountId`.",
    }),
    ApiOkResponse({
      description: "Paginated current and historical purchase requests.",
    }),
    AuthenticationErrors(),
  );

export const GetById = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get a purchase request",
      description:
        "Returns request items, supplier offers, generated invoices, and credit approval information within the caller's own/all permission scope.",
    }),
    requestId(),
    ApiOkResponse({ description: "Purchase request details." }),
    ApiNotFoundResponse({
      description: "The purchase request does not exist.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const Confirm = () =>
  applyDecorators(
    ApiOperation({
      summary: "Confirm a purchase request",
      description:
        "Atomically groups items by supplier and creates one invoice per supplier. Within-limit groups activate immediately; over-limit groups retain their reservations and await that supplier's approval.",
    }),
    requestId(),
    ApiCreatedResponse({
      description:
        "The confirmed purchase request ID and all generated supplier invoices with their individual statuses.",
    }),
    ApiBadRequestResponse({
      description: "The purchase request contains no items.",
      type: ApiErrorResponse,
    }),
    ApiConflictResponse({
      description:
        "The request expired or was processed, or its reserved stock is no longer available.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const Cancel = () =>
  applyDecorators(
    ApiOperation({
      summary: "Cancel an open purchase request",
      description:
        "Cancels an open request for the caller's business and atomically releases all stock reserved by its items.",
    }),
    requestId(),
    ApiCreatedResponse({
      description: "The request was cancelled and reservations were released.",
      type: MessageResponse,
    }),
    ApiNotFoundResponse({
      description: "The request is missing or no longer open.",
      type: ApiErrorResponse,
    }),
    ApiConflictResponse({
      description:
        "A reserved-stock release could not be completed consistently.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );
