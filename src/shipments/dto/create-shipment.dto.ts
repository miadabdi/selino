import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateShipmentDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  carrier!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  trackingCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  estimatedDeliveryAt?: string;
}
