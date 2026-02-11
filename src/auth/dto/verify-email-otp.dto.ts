import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";

export class VerifyEmailOtpDto {
  @ApiProperty({
    description: "Email address",
    example: "user@example.com",
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "6-digit OTP code",
    example: "123456",
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  code: string;
}
