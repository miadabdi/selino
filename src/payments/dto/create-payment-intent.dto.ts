import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreatePaymentIntentDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  invoiceId!: number;

  @ApiProperty({ enum: ["wallet", "external"] })
  @IsIn(["wallet", "external"])
  fundingSource!: "wallet" | "external";

  @ApiPropertyOptional({
    description:
      "Provider adapter name. Required by the application layer for external payments.",
    example: "manual",
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  provider?: string;

  @ApiProperty({ description: "Caller-generated idempotency key" })
  @IsString()
  @MaxLength(120)
  idempotencyKey!: string;
}
