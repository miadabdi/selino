import { IsOptional, IsString } from "class-validator";

export class RejectOverLimitTradeDto {
  @IsOptional()
  @IsString()
  note?: string;
}
