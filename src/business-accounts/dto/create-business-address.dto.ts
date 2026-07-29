import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export const businessAddressTypes = [
  "headquarters",
  "billing",
  "shipping",
  "warehouse",
  "other",
] as const;

export type BusinessAddressType = (typeof businessAddressTypes)[number];

export class CreateBusinessAddressDto {
  @ApiPropertyOptional({ enum: businessAddressTypes, default: "other" })
  @IsIn(businessAddressTypes)
  @IsOptional()
  type?: BusinessAddressType;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  label?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  recipientName?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(30)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ default: "IR" })
  @IsString()
  @Length(2, 2)
  @IsOptional()
  countryCode?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  province!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  addressLine!: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(20)
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
