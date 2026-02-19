import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateProductDto {
  @ApiProperty()
  @IsInt()
  categoryId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  brandId?: number;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  model?: string;

  @ApiProperty({ type: Object })
  @Transform(({ value }) => {
    if (typeof value !== "string") {
      return value;
    }

    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  })
  @IsObject()
  specs!: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @Transform(({ value }) => {
    if (typeof value !== "string") {
      return value;
    }

    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  warrantyMonths?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  weightGrams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dimensions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  searchText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  defaultImageFileId?: number;
}
