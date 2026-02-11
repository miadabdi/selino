import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UserBase {
  @ApiProperty({
    description: "User ID",
    example: 1,
  })
  @IsInt()
  id: number;

  @ApiProperty({
    description: "Account creation timestamp",
    example: "2024-01-01T00:00:00.000Z",
  })
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    description: "Last update timestamp",
    example: "2024-01-01T00:00:00.000Z",
  })
  @IsDate()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: "Deletion timestamp (soft delete)",
    example: null,
  })
  @IsOptional()
  @IsDate()
  deletedAt?: Date | null;

  @ApiProperty({
    description: "User's phone number in E.164 format",
    example: "+989123456789",
  })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({
    description: "User's email address",
    example: "user@example.com",
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({
    description: "User's first name",
    example: "John",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string | null;

  @ApiPropertyOptional({
    description: "User's last name",
    example: "Doe",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string | null;

  @ApiPropertyOptional({
    description: "Last login timestamp",
    example: "2024-01-01T00:00:00.000Z",
  })
  @IsOptional()
  @IsDate()
  lastLoginAt?: Date | null;

  @ApiProperty({
    description: "Whether the phone number is verified",
    example: true,
  })
  @IsBoolean()
  isPhoneVerified: boolean;

  @ApiProperty({
    description: "Whether the email address is verified",
    example: false,
  })
  @IsBoolean()
  isEmailVerified: boolean;
}
