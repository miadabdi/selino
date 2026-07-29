import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ApproveOverLimitTradeDto {
  @ApiPropertyOptional({
    description: "Optional internal note explaining the approval decision",
    example: "Approved for this strategic purchase",
  })
  @IsOptional()
  @IsString()
  note?: string;
}
