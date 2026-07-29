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
import { BusinessAccountProfileDto } from "./dto/business-account-profile.dto.js";
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
        "Returns one active business account by ID with resolved logo and business-license URLs. Soft-deleted businesses are treated as missing.",
    }),
    businessId(),
    ApiOkResponse({
      description: "The active business account profile.",
      type: BusinessAccountProfileDto,
    }),
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
        "Updates supplied business and license details. Renaming regenerates the unique slug; uploading a logo or license image replaces and soft-deletes the previous file.",
    }),
    businessId(),
    ApiBody({ type: UpdateBusinessAccountBody }),
    ApiOkResponse({
      description: "The updated business account.",
      type: BusinessAccountProfileDto,
    }),
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

export const ListMembers = () =>
  applyDecorators(
    ApiOperation({
      summary: "List business team members",
      description:
        "Returns active memberships with each member's user profile and assigned business role.",
    }),
    businessId(),
    ApiOkResponse({ description: "Business team with user and role details." }),
    AuthenticationErrors(),
  );

export const GetMember = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get a business team member",
      description:
        "Returns one active membership, including the member profile and assigned business role.",
    }),
    businessId(),
    NumericIdParam("userId", "Member user ID"),
    ApiOkResponse({ description: "Business membership details." }),
    ApiNotFoundResponse({
      description: "The business account or member was not found.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const UpdateMember = () =>
  applyDecorators(
    ApiOperation({
      summary: "Update a business team member",
      description:
        "Changes a member's business role or active state while preserving at least one active manager.",
    }),
    businessId(),
    NumericIdParam("userId", "Member user ID"),
    ApiOkResponse({ description: "The updated business membership." }),
    ApiConflictResponse({
      description: "The change would remove the last active manager.",
      type: ApiErrorResponse,
    }),
    ApiNotFoundResponse({
      description: "The business account, member, or role was not found.",
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

export const ListAddresses = () =>
  applyDecorators(
    ApiOperation({
      summary: "List business addresses",
      description:
        "Returns the business's non-deleted operational addresses and their map coordinates.",
    }),
    businessId(),
    ApiOkResponse({
      description: "Active and inactive non-deleted addresses.",
    }),
    AuthenticationErrors(),
  );

export const GetAddress = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get a business address",
      description:
        "Returns one non-deleted address owned by the selected business account.",
    }),
    businessId(),
    NumericIdParam("addressId", "Business address ID"),
    ApiOkResponse({ description: "Business address details." }),
    ApiNotFoundResponse({
      description: "The business account or address was not found.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const CreateAddress = () =>
  applyDecorators(
    ApiOperation({
      summary: "Create a business address",
      description:
        "Adds an operational address with validated contact details and optional map coordinates.",
    }),
    businessId(),
    ApiCreatedResponse({ description: "The new business address." }),
    ApiBadRequestResponse({
      description: "Coordinates or address fields are invalid.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const UpdateAddress = () =>
  applyDecorators(
    ApiOperation({
      summary: "Update a business address",
      description:
        "Updates supplied fields on an existing non-deleted business address.",
    }),
    businessId(),
    NumericIdParam("addressId", "Business address ID"),
    ApiOkResponse({ description: "The updated business address." }),
    ApiBadRequestResponse({
      description: "Coordinates or address fields are invalid.",
      type: ApiErrorResponse,
    }),
    ApiNotFoundResponse({
      description: "The business account or address was not found.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const RemoveAddress = () =>
  applyDecorators(
    ApiOperation({
      summary: "Remove a business address",
      description:
        "Soft-deletes an address owned by the selected business account.",
    }),
    businessId(),
    NumericIdParam("addressId", "Business address ID"),
    ApiOkResponse({
      description: "The business address was soft-deleted.",
      type: MessageResponse,
    }),
    ApiNotFoundResponse({
      description: "The business account or address was not found.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );
