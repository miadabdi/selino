import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsNumber, IsOptional } from "class-validator";

export class CreateInventoryDto {
  @ApiProperty()
  @IsInt()
  productId!: number;

  @ApiProperty()
  @IsNumber()
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  stock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  minOrderQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxOrderQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
