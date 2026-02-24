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
    type: Date,
    nullable: true,
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
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({
    description: "User's first name",
    example: "John",
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string | null;

  @ApiPropertyOptional({
    description: "User's last name",
    example: "Doe",
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string | null;

  @ApiPropertyOptional({
    description: "Last login timestamp",
    example: "2024-01-01T00:00:00.000Z",
    type: Date,
    nullable: true,
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

  @ApiPropertyOptional({
    description: "Profile picture file ID (FK to files.id)",
    example: 42,
    type: Number,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  profilePictureId?: number | null;

  @ApiPropertyOptional({
    description: "Resolved profile picture URL",
    example: "https://storage.example.com/profile-media/uuid.jpg",
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  profilePictureUrl?: string | null;
}
