import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from "class-validator";

export class ListCreditTransactionsQueryDto {
  @ApiPropertyOptional({
    enum: ["purchase", "return", "adjustment", "settlement"],
  })
  @IsIn(["purchase", "return", "adjustment", "settlement"])
  @IsOptional()
  type?: "purchase" | "return" | "adjustment" | "settlement";

  @ApiPropertyOptional({
    description:
      "Business status derived from the referenced invoice or settlement.",
    enum: ["pending", "completed", "cancelled"],
  })
  @IsIn(["pending", "completed", "cancelled"])
  @IsOptional()
  status?: "pending" | "completed" | "cancelled";

  @ApiPropertyOptional({
    description:
      "Transaction code, product, description, or agreement-party search.",
  })
  @IsString()
  @MaxLength(100)
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
