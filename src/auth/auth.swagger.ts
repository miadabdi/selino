import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  RefreshTokenDto,
  SendEmailOtpDto,
  SendOtpDto,
  VerifyEmailOtpDto,
  VerifyOtpDto,
} from "./dto/index";
import { AuthTokensResponse, MessageResponse } from "./responses/index";
import { ApiErrorResponse, PublicApi } from "../swagger/swagger.decorators";

export const ControllerDocs = () => PublicApi("Auth");

const validationError = () =>
  ApiBadRequestResponse({
    description: "The request body failed validation.",
    type: ApiErrorResponse,
  });

export const SendPhoneOtp = () =>
  applyDecorators(
    ApiOperation({
      summary: "Send a phone sign-in code",
      description:
        "Sends a one-time code by SMS to begin passwordless sign-in. Calling this endpoint does not create a user; a new account is created only after a valid code is verified.",
    }),
    ApiBody({ type: SendOtpDto }),
    ApiOkResponse({
      description: "The OTP was accepted for delivery.",
      type: MessageResponse,
    }),
    validationError(),
  );

export const VerifyPhoneOtp = () =>
  applyDecorators(
    ApiOperation({
      summary: "Verify a phone code and sign in",
      description:
        "Validates the SMS code, creates the user on first sign-in, marks the phone as verified, and returns a JWT access token plus a rotating refresh token.",
    }),
    ApiBody({ type: VerifyOtpDto }),
    ApiOkResponse({
      description: "Authentication succeeded and a new token pair was issued.",
      type: AuthTokensResponse,
    }),
    validationError(),
    ApiUnauthorizedResponse({
      description: "The OTP is invalid or expired.",
      type: ApiErrorResponse,
    }),
  );

export const SendEmailOtp = () =>
  applyDecorators(
    ApiBearerAuth("bearer"),
    ApiOperation({
      summary: "Send an email verification code",
      description:
        "Sends a one-time code to an email address for the authenticated user. Use the email verification endpoint to finish verification.",
    }),
    ApiBody({ type: SendEmailOtpDto }),
    ApiOkResponse({
      description: "The email OTP was accepted for delivery.",
      type: MessageResponse,
    }),
    validationError(),
    ApiUnauthorizedResponse({
      description: "The access token is missing, invalid, or expired.",
      type: ApiErrorResponse,
    }),
  );

export const VerifyEmailOtp = () =>
  applyDecorators(
    ApiBearerAuth("bearer"),
    ApiOperation({
      summary: "Verify the user's email address",
      description:
        "Validates the one-time email code and marks the matching user's email address as verified.",
    }),
    ApiBody({ type: VerifyEmailOtpDto }),
    ApiOkResponse({
      description: "The email address was verified.",
      type: MessageResponse,
    }),
    validationError(),
    ApiUnauthorizedResponse({
      description:
        "The access token is invalid, or the email OTP is invalid or expired.",
      type: ApiErrorResponse,
    }),
  );

export const StartGoogleLogin = () =>
  applyDecorators(
    ApiOperation({
      summary: "Start Google sign-in",
      description:
        "Redirects the browser to Google's OAuth consent screen. Google returns the user to the private callback endpoint after authorization.",
    }),
    ApiFoundResponse({ description: "Redirect to Google OAuth." }),
  );

export const HideGoogleCallback = () => ApiExcludeEndpoint();

export const RefreshSession = () =>
  applyDecorators(
    ApiOperation({
      summary: "Rotate a refresh token",
      description:
        "Exchanges a valid refresh token for a new access/refresh pair. Rotation invalidates the submitted refresh token, so store the newly returned token.",
    }),
    ApiBody({ type: RefreshTokenDto }),
    ApiOkResponse({
      description: "A new token pair was issued.",
      type: AuthTokensResponse,
    }),
    validationError(),
    ApiUnauthorizedResponse({
      description: "The refresh token is invalid, expired, revoked, or reused.",
      type: ApiErrorResponse,
    }),
  );

export const Logout = () =>
  applyDecorators(
    ApiOperation({
      summary: "End one session",
      description:
        "Revokes the submitted refresh token. This ends that refresh-token session but does not revoke other devices' sessions.",
    }),
    ApiBody({ type: RefreshTokenDto }),
    ApiOkResponse({
      description: "The refresh token was revoked.",
      type: MessageResponse,
    }),
    validationError(),
    ApiUnauthorizedResponse({
      description: "The refresh token is invalid, expired, or already revoked.",
      type: ApiErrorResponse,
    }),
  );

export const LogoutAll = () =>
  applyDecorators(
    ApiBearerAuth("bearer"),
    ApiOperation({
      summary: "End all of the user's sessions",
      description:
        "Revokes every refresh token owned by the authenticated user, requiring all devices to sign in again after their access tokens expire.",
    }),
    ApiOkResponse({
      description: "All refresh-token sessions were revoked.",
      type: MessageResponse,
    }),
    ApiUnauthorizedResponse({
      description: "The access token is missing, invalid, or expired.",
      type: ApiErrorResponse,
    }),
  );
