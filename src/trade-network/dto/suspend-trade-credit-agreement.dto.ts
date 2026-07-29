import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class SuspendTradeCreditAgreementDto {
  @ApiProperty({
    description: "Reason new credit purchases must be disabled",
    example: "Agreement terms are under review",
  })
  @IsString()
  reason!: string;
}
