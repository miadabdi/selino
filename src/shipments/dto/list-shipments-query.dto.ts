import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export const shipmentStatuses = [
  "pending",
  "ready_for_pickup",
  "in_transit",
  "delayed",
  "delivered",
  "failed",
  "cancelled",
] as const;

export class ListShipmentsQueryDto {
  @ApiPropertyOptional({ enum: shipmentStatuses })
  @IsOptional()
  @IsIn(shipmentStatuses)
  status?: (typeof shipmentStatuses)[number];

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  orderId?: number;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;
}
