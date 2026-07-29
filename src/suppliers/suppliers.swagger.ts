import { applyDecorators } from "@nestjs/common";
import {
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
} from "../swagger/swagger.decorators.js";

const businessId = () =>
  NumericIdParam("businessAccountId", "Business that owns the supplier link");
const linkId = () => NumericIdParam("id", "Supplier link ID");

export const ControllerDocs = () => ProtectedApi("Suppliers");
export const List = () =>
  applyDecorators(
    ApiOperation({
      summary: "List linked suppliers and performance",
      description:
        "Returns paginated supplier relationships with operational performance aggregates.",
    }),
    businessId(),
    ApiOkResponse({ description: "Paginated linked suppliers." }),
    AuthenticationErrors(),
  );
export const Get = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get a linked supplier",
      description:
        "Returns one supplier relationship owned by the selected business with performance details.",
    }),
    businessId(),
    linkId(),
    ApiOkResponse({ description: "Supplier relationship and performance." }),
    ApiNotFoundResponse({ type: ApiErrorResponse }),
    AuthenticationErrors(),
  );
export const Create = () =>
  applyDecorators(
    ApiOperation({
      summary: "Register a supplier relationship",
      description:
        "Links an existing supplier business to the selected buyer business.",
    }),
    businessId(),
    ApiCreatedResponse({ description: "The new supplier link." }),
    ApiNotFoundResponse({ type: ApiErrorResponse }),
    AuthenticationErrors(),
  );
export const Update = () =>
  applyDecorators(
    ApiOperation({
      summary: "Update a supplier relationship",
      description:
        "Updates the relationship status, notes, and operational metadata for a linked supplier.",
    }),
    businessId(),
    linkId(),
    ApiOkResponse({ description: "The updated supplier link." }),
    ApiNotFoundResponse({ type: ApiErrorResponse }),
    AuthenticationErrors(),
  );
export const Remove = () =>
  applyDecorators(
    ApiOperation({
      summary: "Remove a supplier relationship",
      description:
        "Soft-deletes a supplier relationship owned by the selected business.",
    }),
    businessId(),
    linkId(),
    ApiOkResponse({ description: "The supplier link was removed." }),
    ApiNotFoundResponse({ type: ApiErrorResponse }),
    AuthenticationErrors(),
  );
