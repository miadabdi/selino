import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class RejectOverLimitTradeDto {
  @ApiPropertyOptional({
    description: "Optional internal note explaining the rejection decision",
    example: "Reduce the order quantity and resubmit",
  })
  @IsOptional()
  @IsString()
  note?: string;
}
