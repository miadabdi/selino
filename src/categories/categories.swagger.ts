import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
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

export const ControllerDocs = () => ProtectedApi("Categories");

const categoryId = () => NumericIdParam("id", "Category ID");

export const List = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get the category hierarchy",
      description:
        "Returns all active categories as a nested tree. Root categories contain recursively nested `children`, ordered by position and name.",
    }),
    ApiOkResponse({ description: "The active category tree.", isArray: true }),
    AuthenticationErrors(),
  );

export const Create = () =>
  applyDecorators(
    ApiOperation({
      summary: "Create a category",
      description:
        "Creates a root or child category, generates a unique slug, and optionally defines the product specification schema used to validate products in that category. Requires category-create permission.",
    }),
    ApiCreatedResponse({ description: "The newly created category." }),
    ApiBadRequestResponse({
      description: "The parent category or submitted fields are invalid.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const Update = () =>
  applyDecorators(
    ApiOperation({
      summary: "Update a category",
      description:
        "Updates category metadata or parent placement. Changing its name regenerates its slug. Requires category-update permission.",
    }),
    categoryId(),
    ApiOkResponse({ description: "The updated category." }),
    ApiNotFoundResponse({
      description: "The category does not exist or was deleted.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const GetSpecSchema = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get a category's product specification schema",
      description:
        "Returns the JSON specification definition used to validate product `specs` for this category, or an empty object when no fields are defined.",
    }),
    categoryId(),
    ApiOkResponse({
      description: "A map of specification names to their type and rules.",
      schema: { type: "object", additionalProperties: true },
    }),
    ApiNotFoundResponse({
      description: "The category does not exist or was deleted.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const ReplaceSpecSchema = () =>
  applyDecorators(
    ApiOperation({
      summary: "Replace a category's specification schema",
      description:
        "Replaces the complete product specification definition for a category. Existing products are not rewritten; future product creates and spec updates are validated against the new schema.",
    }),
    categoryId(),
    ApiOkResponse({ description: "The category with its new schema." }),
    ApiBadRequestResponse({
      description: "The category or schema object is invalid.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );
