import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateTradeCreditAgreementDto {
  @ApiProperty({
    description: "Business account receiving goods and using the credit",
    example: 12,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  buyerBusinessAccountId!: number;

  @ApiProperty({
    description: "Business account supplying goods and extending the credit",
    example: 34,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierBusinessAccountId!: number;

  @ApiPropertyOptional({
    description: "Short name used to recognize this agreement",
    example: "Summer wholesale terms",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @ApiPropertyOptional({
    description: "Free-form explanation of the commercial arrangement",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Maximum outstanding credit before owner approval is required",
    example: 500000000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimit!: number;

  @ApiPropertyOptional({
    description: "Currency code used by the agreement",
    example: "IRR",
    default: "IRR",
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({
    description: "Settlement recurrence label",
    example: "monthly",
    default: "monthly",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  settlementCycle?: string;

  @ApiPropertyOptional({
    description: "Preferred day of month for settlement",
    example: 15,
    minimum: 1,
    maximum: 31,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  settlementDayOfMonth?: number;

  @ApiPropertyOptional({
    description: "Optional agreement start timestamp in ISO 8601 format",
    example: "2026-08-01T00:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({
    description: "Optional agreement end timestamp in ISO 8601 format",
    example: "2027-07-31T23:59:59.000Z",
  })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
