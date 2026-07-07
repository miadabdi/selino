import { IsString } from "class-validator";

export class SuspendTradeCreditAgreementDto {
  @IsString()
  reason!: string;
}
