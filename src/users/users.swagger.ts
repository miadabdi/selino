import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
} from "@nestjs/swagger";
import { GetMeResponse, UpdateProfileBody, UserBase } from "./dto/index";
import {
  ApiErrorResponse,
  AuthenticationErrors,
  ProtectedApi,
} from "../swagger/swagger.decorators";

export const ControllerDocs = () => ProtectedApi("Users");

export const UpdateProfile = () =>
  applyDecorators(
    ApiConsumes("multipart/form-data"),
    ApiOperation({
      summary: "Update the authenticated user's profile",
      description:
        "Updates any supplied name or email fields and optionally replaces the profile picture. Changing the email marks it unverified and sends a new verification code. Images are cropped to the configured square profile size.",
    }),
    ApiBody({ type: UpdateProfileBody }),
    ApiOkResponse({
      description: "The stored user record after the update.",
      type: UserBase,
    }),
    ApiBadRequestResponse({
      description: "A field or uploaded image failed validation.",
      type: ApiErrorResponse,
    }),
    ApiConflictResponse({
      description: "The requested email address is already in use.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const GetProfile = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get the authenticated user's profile",
      description:
        "Returns identity details, the resolved profile-picture URL, the user's primary role, effective permissions, and active business memberships.",
    }),
    ApiOkResponse({
      description: "The enriched authenticated-user profile.",
      type: GetMeResponse,
    }),
    AuthenticationErrors(),
  );
