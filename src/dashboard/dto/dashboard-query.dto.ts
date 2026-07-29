import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional } from "class-validator";

export class DashboardQueryDto {
  @ApiPropertyOptional({
    description:
      "Inclusive ISO date used as the start of the dashboard period.",
    example: "2026-07-01",
  })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    description: "Inclusive ISO date used as the end of the dashboard period.",
    example: "2026-07-31",
  })
  @IsDateString()
  @IsOptional()
  to?: string;
}
