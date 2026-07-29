import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class RefundPaymentDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({ description: "Caller-generated refund idempotency key" })
  @IsString()
  @MaxLength(120)
  idempotencyKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: "Opaque refund reference returned by an external provider",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  providerReference?: string;
}
