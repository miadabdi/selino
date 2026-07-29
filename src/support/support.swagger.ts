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
  NumericIdParam("businessAccountId", "Business that owns the support ticket");
const ticketId = () => NumericIdParam("id", "Support ticket ID");

export const ControllerDocs = () => ProtectedApi("Support");
export const List = () =>
  applyDecorators(
    ApiOperation({
      summary: "List support tickets",
      description:
        "Returns paginated support tickets owned by the selected business with status filters.",
    }),
    businessId(),
    ApiOkResponse({ description: "Paginated support tickets." }),
    AuthenticationErrors(),
  );
export const Get = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get a support ticket conversation",
      description:
        "Returns one business-owned ticket with its ordered messages and attachments.",
    }),
    businessId(),
    ticketId(),
    ApiOkResponse({ description: "The ticket, messages, and attachments." }),
    ApiNotFoundResponse({ type: ApiErrorResponse }),
    AuthenticationErrors(),
  );
export const Create = () =>
  applyDecorators(
    ApiOperation({
      summary: "Open a support ticket",
      description:
        "Creates a support ticket and its initial message for the selected business.",
    }),
    businessId(),
    ApiCreatedResponse({ description: "The created ticket." }),
    AuthenticationErrors(),
  );
export const AddMessage = () =>
  applyDecorators(
    ApiOperation({
      summary: "Reply to a support ticket",
      description:
        "Appends a message and optional attachments to an existing business-owned ticket.",
    }),
    businessId(),
    ticketId(),
    ApiCreatedResponse({ description: "The updated ticket conversation." }),
    ApiNotFoundResponse({ type: ApiErrorResponse }),
    AuthenticationErrors(),
  );
export const UpdateStatus = () =>
  applyDecorators(
    ApiOperation({
      summary: "Update a support ticket status",
      description:
        "Transitions a business-owned support ticket to the requested operational status.",
    }),
    businessId(),
    ticketId(),
    ApiOkResponse({ description: "The updated ticket." }),
    ApiNotFoundResponse({ type: ApiErrorResponse }),
    AuthenticationErrors(),
  );
