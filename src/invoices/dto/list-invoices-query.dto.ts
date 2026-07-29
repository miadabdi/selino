import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export class ListInvoicesQueryDto {
  @ApiPropertyOptional({ enum: ["purchase", "sale"], default: "purchase" })
  @IsIn(["purchase", "sale"])
  direction: "purchase" | "sale" = "purchase";

  @ApiPropertyOptional({
    enum: ["active", "history", "recent"],
    default: "active",
    description:
      "Use recent for the home preview across all visible invoice statuses.",
  })
  @IsIn(["active", "history", "recent"])
  view: "active" | "history" | "recent" = "active";

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  supplierBusinessAccountId?: number;

  @ApiPropertyOptional({
    enum: [
      "pending_credit_approval",
      "pending",
      "sent",
      "delivered",
      "paid",
      "rejected",
      "expired",
      "cancelled",
    ],
  })
  @IsIn([
    "pending_credit_approval",
    "pending",
    "sent",
    "delivered",
    "paid",
    "rejected",
    "expired",
    "cancelled",
  ])
  @IsOptional()
  status?:
    | "pending_credit_approval"
    | "pending"
    | "sent"
    | "delivered"
    | "paid"
    | "rejected"
    | "expired"
    | "cancelled";

  @ApiPropertyOptional({ format: "date-time" })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minAmount?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxAmount?: number;

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
