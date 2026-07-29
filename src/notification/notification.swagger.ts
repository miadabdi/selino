import { applyDecorators } from "@nestjs/common";
import {
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

export const ControllerDocs = () => ProtectedApi("Notifications");

export const List = () =>
  applyDecorators(
    ApiOperation({
      summary: "List the authenticated user's notifications",
      description:
        "Returns a paginated inbox, optionally filtered by read state and business context.",
    }),
    ApiOkResponse({ description: "Paginated notification inbox." }),
    AuthenticationErrors(),
  );

export const UnreadCount = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get the unread notification count",
      description:
        "Counts unread notifications owned by the authenticated user.",
    }),
    ApiOkResponse({ description: "Current unread count." }),
    AuthenticationErrors(),
  );

export const MarkAllRead = () =>
  applyDecorators(
    ApiOperation({
      summary: "Mark every notification as read",
      description:
        "Marks all currently unread notifications owned by the authenticated user as read.",
    }),
    ApiOkResponse({ description: "Number of notifications marked as read." }),
    AuthenticationErrors(),
  );

export const MarkRead = () =>
  applyDecorators(
    ApiOperation({
      summary: "Mark one owned notification as read",
      description:
        "Marks one notification as read after verifying it belongs to the authenticated user.",
    }),
    NumericIdParam("id", "Notification ID"),
    ApiOkResponse({ description: "Notification marked as read." }),
    ApiNotFoundResponse({
      description: "The notification does not belong to the current user.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const GetPreferences = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get notification preferences for a business membership",
      description:
        "Returns effective channel and event preferences for the user's selected business membership.",
    }),
    NumericIdParam("businessAccountId", "Business account ID"),
    ApiOkResponse({ description: "Effective notification preferences." }),
    AuthenticationErrors(),
  );

export const UpdatePreferences = () =>
  applyDecorators(
    ApiOperation({
      summary: "Update notification preferences for a business membership",
      description:
        "Persists channel and event preferences for the user's selected business membership.",
    }),
    NumericIdParam("businessAccountId", "Business account ID"),
    ApiOkResponse({ description: "Updated notification preferences." }),
    AuthenticationErrors(),
  );
