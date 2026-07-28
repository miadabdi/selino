import { applyDecorators } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
} from "@nestjs/swagger";
import {
  ApiErrorResponse,
  AuthenticationErrors,
  NumericIdParam,
  ProtectedApi,
} from "../swagger/swagger.decorators";

export const ControllerDocs = () => ProtectedApi("Invoices");

export const List = () =>
  applyDecorators(
    ApiOperation({
      summary: "List purchase or sales invoices",
      description:
        "Returns paginated invoices for a business. Purchase direction uses the business as buyer; sale direction uses it as supplier. Supplier sales exclude invoices awaiting credit approval.",
    }),
    NumericIdParam("businessAccountId", "Business account ID"),
    ApiOkResponse({ description: "Paginated invoices with line items." }),
    AuthenticationErrors(),
  );

export const Get = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get an invoice",
      description:
        "Returns an invoice when the business is its buyer or supplier. A supplier cannot access a provisional invoice through the normal invoice endpoint.",
    }),
    NumericIdParam("businessAccountId", "Business account ID"),
    NumericIdParam("id", "Invoice ID"),
    ApiOkResponse({ description: "Invoice details and line items." }),
    ApiNotFoundResponse({
      description: "Invoice not found or not visible to this business.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const Export = () =>
  applyDecorators(
    ApiOperation({
      summary: "Export selected invoices",
      description:
        "Exports up to 100 selected invoices from one direction and view as a two-sheet Excel workbook containing invoice summaries and line items.",
    }),
    NumericIdParam("businessAccountId", "Business account ID"),
    ApiProduces(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ),
    ApiOkResponse({
      description: "The selected invoice workbook.",
      schema: { type: "string", format: "binary" },
    }),
    ApiNotFoundResponse({
      description:
        "One or more selected invoices are missing or not visible in the requested view.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );
