import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateBusinessAccountDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ enum: ["store", "company"] })
  @IsOptional()
  @IsIn(["store", "company"])
  type?: "store" | "company";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
