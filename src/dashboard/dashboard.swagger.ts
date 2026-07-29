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
        "Returns seller purchase-request, invoice, and wallet counters together with manager sales, order, credit, trend, and recent-order KPIs for one business.",
    }),
    NumericIdParam("businessAccountId", "Dashboard business account"),
    ApiOkResponse({ description: "The aggregated dashboard read model." }),
    ApiBadRequestResponse({
      description: "The requested date range is invalid.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );
