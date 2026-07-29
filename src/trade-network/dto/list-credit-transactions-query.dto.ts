import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
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
