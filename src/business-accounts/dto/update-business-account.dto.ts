import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateBusinessAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ enum: ["store", "company"] })
  @IsOptional()
  @IsIn(["store", "company"])
  type?: "store" | "company";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  legalName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationalId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxId?: string | null;

  @ApiPropertyOptional({ example: "+982112345678" })
  @IsOptional()
  @Matches(/^\+?[0-9]{7,30}$/, {
    message: "phone must contain 7 to 30 digits with an optional leading +",
  })
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ example: "https://example.com" })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  website?: string | null;
}
