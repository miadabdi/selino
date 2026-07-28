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
} from "../swagger/swagger.decorators";

export const ControllerDocs = () => ProtectedApi("Brands");

export const List = () =>
  applyDecorators(
    ApiOperation({
      summary: "List active brands",
      description:
        "Returns every non-deleted brand in the shared catalog, ordered by name.",
    }),
    ApiOkResponse({ description: "The active brand list.", isArray: true }),
    AuthenticationErrors(),
  );

export const Create = () =>
  applyDecorators(
    ApiOperation({
      summary: "Create a brand",
      description:
        "Creates a shared product brand and generates a unique URL-friendly slug from its name. Requires brand-create permission.",
    }),
    ApiCreatedResponse({ description: "The newly created brand." }),
    AuthenticationErrors(),
  );

export const Update = () =>
  applyDecorators(
    ApiOperation({
      summary: "Update a brand",
      description:
        "Updates an active brand. Changing its name also regenerates its unique slug. Requires brand-update permission.",
    }),
    NumericIdParam("id", "Brand ID"),
    ApiOkResponse({ description: "The updated brand." }),
    ApiNotFoundResponse({
      description: "The brand does not exist or was deleted.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );
