import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, Min } from "class-validator";

export const reportGranularities = ["day", "week", "month"] as const;
export type ReportGranularity = (typeof reportGranularities)[number];

export class ReportQueryDto {
  @ApiPropertyOptional({ example: "2026-07-01" })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: "2026-07-31" })
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ enum: reportGranularities, default: "day" })
  @IsIn(reportGranularities)
  @IsOptional()
  granularity: ReportGranularity = "day";

  @ApiPropertyOptional({
    description: "Limit invoice and order aggregates to one supplier.",
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  supplierBusinessAccountId?: number;
}
