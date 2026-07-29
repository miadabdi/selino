import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class AdjustWalletDto {
  @ApiProperty({ enum: ["credit", "debit"] })
  @IsIn(["credit", "debit"])
  direction!: "credit" | "debit";

  @ApiProperty({ example: 5000000, minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({
    description: "Caller-generated idempotency key",
    example: "manual-adjustment-2026-08-01-001",
  })
  @IsString()
  @MaxLength(120)
  reference!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
