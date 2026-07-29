import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateTradeCreditAgreementDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  label?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(50)
  @IsOptional()
  settlementCycle?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 31 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  settlementDayOfMonth?: number;

  @ApiPropertyOptional({ format: "date-time" })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsDateString()
  @IsOptional()
  endsAt?: string;
}
