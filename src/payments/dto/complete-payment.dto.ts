import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class CompletePaymentDto {
  @ApiPropertyOptional({
    description:
      "Opaque reference returned by the external provider. It is not interpreted by Selino.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  providerReference?: string;
}
