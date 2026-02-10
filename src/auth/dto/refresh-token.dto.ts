import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({
    description: "The refresh token to rotate",
    example: "a1b2c3d4e5f6...",
  })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
