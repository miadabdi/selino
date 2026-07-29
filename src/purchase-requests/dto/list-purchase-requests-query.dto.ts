import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

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

  @ApiPropertyOptional({
    enum: [
      "new",
      "pending_credit_approval",
      "confirmed",
      "cancelled",
      "expired",
    ],
  })
  @IsIn(["new", "pending_credit_approval", "confirmed", "cancelled", "expired"])
  @IsOptional()
  status?:
    | "new"
    | "pending_credit_approval"
    | "confirmed"
    | "cancelled"
    | "expired";

  @ApiPropertyOptional({
    description:
      "Dashboard status grouping. under_review maps to pending credit approval; completed maps to confirmed, cancelled, and expired.",
    enum: ["new", "under_review", "completed"],
  })
  @IsIn(["new", "under_review", "completed"])
  @IsOptional()
  statusGroup?: "new" | "under_review" | "completed";

  @ApiPropertyOptional({ description: "Search by request code or notes." })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsDateString()
  @IsOptional()
  to?: string;

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
