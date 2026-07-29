import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
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
  NumericIdParam("businessAccountId", "Report business account");

export const ControllerDocs = () => ProtectedApi("Manager Reports");

export const GetReport = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get manager report aggregates",
      description:
        "Aggregates invoices, orders, wallet balances, credit usage, trends, order statuses, and supplier performance. Sales and order growth compare against the immediately preceding equal-length period; delivery rate remains a separate metric.",
    }),
    businessId(),
    ApiOkResponse({ description: "The report read model." }),
    ApiBadRequestResponse({
      description: "The report date range is invalid.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const ExportExcel = () =>
  applyDecorators(
    ApiOperation({
      summary: "Export the manager report as Excel",
      description:
        "Builds an Excel workbook from the same scoped aggregates returned by the JSON report endpoint.",
    }),
    businessId(),
    ApiOkResponse({
      description: "An XLSX workbook.",
      content: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {},
      },
    }),
    ApiBadRequestResponse({
      description: "The report date range is invalid.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const ExportPdf = () =>
  applyDecorators(
    ApiOperation({
      summary: "Export the manager report as PDF",
      description:
        "Builds a printable PDF from the same scoped aggregates returned by the JSON report endpoint.",
    }),
    businessId(),
    ApiOkResponse({
      description: "A PDF report.",
      content: {
        "application/pdf": {},
      },
    }),
    ApiBadRequestResponse({
      description: "The report date range is invalid.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );
