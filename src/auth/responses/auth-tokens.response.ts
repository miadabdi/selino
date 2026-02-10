import { ApiProperty } from "@nestjs/swagger";

export class AuthTokensResponse {
  @ApiProperty({
    description: "JWT access token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken: string;

  @ApiProperty({
    description: "Refresh token used to obtain new access tokens",
    example: "a1b2c3d4e5f6...",
  })
  refreshToken: string;
}
