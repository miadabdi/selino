import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export class ListTradeCreditAgreementsQueryDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  businessAccountId!: number;

  @ApiPropertyOptional({
    enum: [
      "draft",
      "pending_signatures",
      "active",
      "suspended",
      "expired",
      "cancelled",
      "closed",
    ],
  })
  @IsIn([
    "draft",
    "pending_signatures",
    "active",
    "suspended",
    "expired",
    "cancelled",
    "closed",
  ])
  @IsOptional()
  status?:
    | "draft"
    | "pending_signatures"
    | "active"
    | "suspended"
    | "expired"
    | "cancelled"
    | "closed";

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
