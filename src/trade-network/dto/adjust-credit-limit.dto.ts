import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class AdjustCreditLimitDto {
  @ApiProperty({ enum: ["increase", "decrease"] })
  @IsIn(["increase", "decrease"])
  direction!: "increase" | "decrease";

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  reason?: string;
}
