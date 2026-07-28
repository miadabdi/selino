import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from "@nestjs/swagger";
import { MessageResponse } from "../auth/responses/index";
import {
  ApiErrorResponse,
  AuthenticationErrors,
  NumericIdParam,
  ProtectedApi,
} from "../swagger/swagger.decorators";
import { CreateBusinessAccountBody } from "./dto/create-business-account-body.dto";
import { UpdateBusinessAccountBody } from "./dto/update-business-account-body.dto";

export const ControllerDocs = () => ProtectedApi("Business Accounts");

const businessId = () => NumericIdParam("id", "Business account ID");

export const Create = () =>
  applyDecorators(
    ApiConsumes("multipart/form-data"),
    ApiOperation({
      summary: "Create a business account",
      description:
        "Creates a store or company with a generated unique slug, optionally uploads its logo, and makes the authenticated user an active manager of the new business.",
    }),
    ApiBody({ type: CreateBusinessAccountBody }),
    ApiCreatedResponse({
      description: "The newly created business account.",
    }),
    ApiBadRequestResponse({
      description: "The form fields or logo upload are invalid.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const GetById = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get a business account",
      description:
        "Returns one active business account by ID. Soft-deleted businesses are treated as missing.",
    }),
    businessId(),
    ApiOkResponse({ description: "The active business account." }),
    ApiNotFoundResponse({
      description: "The business account does not exist or was deleted.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const Update = () =>
  applyDecorators(
    ApiConsumes("multipart/form-data"),
    ApiOperation({
      summary: "Update a business account",
      description:
        "Updates supplied business details. Renaming regenerates the unique slug; uploading a logo replaces and soft-deletes the old logo.",
    }),
    businessId(),
    ApiBody({ type: UpdateBusinessAccountBody }),
    ApiOkResponse({ description: "The updated business account." }),
    ApiBadRequestResponse({
      description: "The form fields or logo upload are invalid.",
      type: ApiErrorResponse,
    }),
    ApiNotFoundResponse({
      description: "The business account does not exist or was deleted.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const Delete = () =>
  applyDecorators(
    ApiOperation({
      summary: "Delete a business account",
      description:
        "Soft-deletes an active business account. The record remains in the database but is no longer returned by active lookups.",
    }),
    businessId(),
    ApiOkResponse({
      description: "The business account was soft-deleted.",
      type: MessageResponse,
    }),
    ApiNotFoundResponse({
      description: "The business account does not exist or was deleted.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const AddMember = () =>
  applyDecorators(
    ApiOperation({
      summary: "Add a member to a business",
      description:
        "Adds a user to the business account with the requested stable role key, creating or resolving that role as required.",
    }),
    businessId(),
    ApiCreatedResponse({ description: "The new business membership." }),
    ApiConflictResponse({
      description: "The user is already a member of this business.",
      type: ApiErrorResponse,
    }),
    ApiNotFoundResponse({
      description: "The business account does not exist or was deleted.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const RemoveMember = () =>
  applyDecorators(
    ApiOperation({
      summary: "Remove a business member",
      description:
        "Removes the selected user's membership from an active business account.",
    }),
    businessId(),
    NumericIdParam("userId", "User ID whose membership will be removed"),
    ApiOkResponse({
      description: "The membership was removed.",
      type: MessageResponse,
    }),
    ApiNotFoundResponse({
      description: "The business account or membership was not found.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );
