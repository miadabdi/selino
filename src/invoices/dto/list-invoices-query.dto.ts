import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export class ListInvoicesQueryDto {
  @ApiPropertyOptional({ enum: ["purchase", "sale"], default: "purchase" })
  @IsIn(["purchase", "sale"])
  direction: "purchase" | "sale" = "purchase";

  @ApiPropertyOptional({ enum: ["active", "history"], default: "active" })
  @IsIn(["active", "history"])
  view: "active" | "history" = "active";

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
