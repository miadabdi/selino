import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export const supplierLinkStatuses = [
  "pending",
  "active",
  "suspended",
  "rejected",
  "terminated",
] as const;
export type SupplierLinkStatus = (typeof supplierLinkStatuses)[number];

export class ListSuppliersQueryDto {
  @ApiPropertyOptional({ description: "Search supplier name or slug." })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: supplierLinkStatuses })
  @IsIn(supplierLinkStatuses)
  @IsOptional()
  status?: SupplierLinkStatus;

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
