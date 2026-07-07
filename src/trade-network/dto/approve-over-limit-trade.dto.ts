import { IsOptional, IsString } from "class-validator";

export class ApproveOverLimitTradeDto {
  @IsOptional()
  @IsString()
  note?: string;
}
