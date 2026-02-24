import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserProfileResponse {
  @ApiProperty({ description: "User ID", example: 1 })
  id: number;

  @ApiProperty({
    description: "Account creation timestamp",
    example: "2026-01-15T10:30:00.000Z",
  })
  createdAt: Date;

  @ApiProperty({
    description: "Last update timestamp",
    example: "2026-02-10T08:00:00.000Z",
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: "Soft-delete timestamp",
    example: null,
    nullable: true,
  })
  deletedAt: Date | null;

  @ApiProperty({
    description: "Phone number in E.164 format",
    example: "+989123456789",
  })
  phone: string;

  @ApiPropertyOptional({
    description: "Email address",
    example: "user@example.com",
    nullable: true,
  })
  email: string | null;

  @ApiPropertyOptional({
    description: "First name",
    example: "John",
    nullable: true,
  })
  firstName: string | null;

  @ApiPropertyOptional({
    description: "Last name",
    example: "Doe",
    nullable: true,
  })
  lastName: string | null;

  @ApiPropertyOptional({
    description: "Last login timestamp",
    example: "2026-02-10T08:00:00.000Z",
    nullable: true,
  })
  lastLoginAt: Date | null;

  @ApiProperty({ description: "Whether the phone is verified", example: true })
  isPhoneVerified: boolean;

  @ApiProperty({ description: "Whether the email is verified", example: false })
  isEmailVerified: boolean;
}
