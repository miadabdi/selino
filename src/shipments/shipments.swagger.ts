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

export const ControllerDocs = () => ProtectedApi("Shipments");
const businessId = () =>
  NumericIdParam("businessAccountId", "Business account tracking shipments");
const shipmentId = () => NumericIdParam("id", "Shipment ID");
const errors = () =>
  applyDecorators(
    ApiNotFoundResponse({ type: ApiErrorResponse }),
    ApiConflictResponse({ type: ApiErrorResponse }),
    AuthenticationErrors(),
  );
export const List = () =>
  applyDecorators(
    ApiOperation({
      summary: "List tracked shipments",
      description:
        "Returns paginated shipments with real buyer and supplier details, invoice item counts, delivery addresses, coordinates, delay state, and the directly linked order.",
    }),
    businessId(),
    ApiOkResponse({ description: "Paginated shipments." }),
    errors(),
  );
export const GetShipment = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get shipment and location timeline",
      description:
        "Returns shipment details with ordered location events and the latest known position.",
    }),
    businessId(),
    shipmentId(),
    ApiOkResponse({ description: "Shipment with latest location history." }),
    errors(),
  );
export const Create = () =>
  applyDecorators(
    ApiOperation({
      summary: "Create a shipment for an order ready to dispatch",
      description:
        "Creates one shipment for an eligible order, or returns the order's existing shipment.",
    }),
    businessId(),
    ApiCreatedResponse({ description: "New or existing order shipment." }),
    errors(),
  );
export const Update = () =>
  applyDecorators(
    ApiOperation({
      summary: "Update shipment details and lifecycle",
      description:
        "Dispatch and delivery transitions synchronize the parent order in the same transaction.",
    }),
    businessId(),
    shipmentId(),
    ApiOkResponse({ description: "Updated shipment." }),
    errors(),
  );
export const RecordLocation = () =>
  applyDecorators(
    ApiOperation({
      summary: "Append a shipment location event",
      description:
        "Records a timestamped latitude and longitude update in the shipment tracking timeline.",
    }),
    businessId(),
    shipmentId(),
    ApiCreatedResponse({ description: "Recorded location event." }),
    errors(),
  );
