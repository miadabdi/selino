import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class ListPurchaseRequestsQueryDto {
  @ApiPropertyOptional({
    description:
      "Optional admin filter. Non-admin callers may only provide their own business account ID.",
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  buyerBusinessAccountId?: number;

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
