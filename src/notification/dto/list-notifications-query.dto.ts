import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({
    description: "Limit the inbox to one active business membership.",
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  businessAccountId?: number;

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

  @ApiPropertyOptional({ default: false })
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  @IsOptional()
  unreadOnly = false;
}
