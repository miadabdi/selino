import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateInvoiceStatusDto {
  @ApiProperty({ enum: ["sent", "delivered", "cancelled"] })
  @IsIn(["sent", "delivered", "cancelled"])
  status!: "sent" | "delivered" | "cancelled";

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  reason?: string;
}
