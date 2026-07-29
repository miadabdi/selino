import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateSupplierLinkDto {
  @ApiProperty({ description: "Business account to register as a supplier." })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierBusinessAccountId!: number;

  @ApiPropertyOptional({ description: "Internal relationship notes." })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;
}
