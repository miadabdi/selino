import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import {
  supplierLinkStatuses,
  type SupplierLinkStatus,
} from "./list-suppliers-query.dto.js";

export class UpdateSupplierLinkDto {
  @ApiPropertyOptional({ enum: supplierLinkStatuses })
  @IsIn(supplierLinkStatuses)
  @IsOptional()
  status?: SupplierLinkStatus;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;
}
