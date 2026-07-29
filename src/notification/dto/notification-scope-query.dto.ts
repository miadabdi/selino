import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class NotificationScopeQueryDto {
  @ApiPropertyOptional({
    description: "Limit the operation to one active business membership.",
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  businessAccountId?: number;
}
