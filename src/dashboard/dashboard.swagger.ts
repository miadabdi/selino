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

export const ControllerDocs = () => ProtectedApi("Manager Dashboard");

export const Overview = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get operational dashboard aggregates",
      description:
        "Returns seller counters together with manager current-period KPIs, equal-length previous-period comparisons, chart series, enriched product/supplier rows, and orders with shipment context. Zero values remain valid values; comparison percentages are null only when a non-zero current value has no non-zero baseline.",
    }),
    NumericIdParam("businessAccountId", "Dashboard business account"),
    ApiOkResponse({ description: "The aggregated dashboard read model." }),
    ApiBadRequestResponse({
      description: "The requested date range is invalid.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );
