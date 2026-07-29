import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { orderStatuses } from "./list-orders-query.dto";

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: orderStatuses })
  @IsIn(orderStatuses)
  status!: (typeof orderStatuses)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
