import { applyDecorators } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ApiErrorResponse {
  @ApiProperty({
    description: "Human-readable explanation of why the request failed",
    example: "Resource not found",
  })
  error!: string;

  @ApiPropertyOptional({
    description: "Request field associated with the error, when applicable",
    example: "productId",
  })
  field?: string;
}

export function PublicApi(tag: string) {
  return ApiTags(tag);
}

export function ProtectedApi(tag: string) {
  return applyDecorators(ApiTags(tag), ApiBearerAuth("bearer"));
}

export function AuthenticationErrors() {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description: "The access token is missing, invalid, or expired.",
      type: ApiErrorResponse,
    }),
    ApiForbiddenResponse({
      description:
        "The authenticated user lacks the required membership or permission.",
      type: ApiErrorResponse,
    }),
  );
}

export function NumericIdParam(name = "id", description = "Resource ID") {
  return ApiParam({ name, type: Number, description, example: 1 });
}
