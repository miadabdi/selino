import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class SearchTradeOffersQueryDto {
  @ApiPropertyOptional({
    description: "Text matched against product title, model, and search text",
    example: "laptop",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    description: "One-based result page",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: "Results per page",
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @ApiPropertyOptional({
    description: "Only show suppliers covered by an active credit agreement",
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === "true") {
      return true;
    }

    if (value === false || value === "false") {
      return false;
    }

    return value;
  })
  @IsBoolean()
  contractOnly = false;

  @ApiPropertyOptional({
    description: "Result ordering",
    enum: ["relevance", "price_asc", "price_desc"],
    default: "relevance",
  })
  @IsOptional()
  @IsIn(["relevance", "price_asc", "price_desc"])
  sort: "relevance" | "price_asc" | "price_desc" = "relevance";
}
